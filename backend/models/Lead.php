<?php
require_once __DIR__ . '/../config/Database.php';

class Lead {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getAll(?string $status = null, ?string $search = null) {
        $query = "SELECT * FROM leads WHERE 1=1";
        $params = [];
        if ($status) {
            if (strcasecmp($status, 'Draft') === 0 || strcasecmp($status, 'Pending') === 0) {
                $query .= " AND (status = 'Pending' OR status = 'Draft' OR status IS NULL)";
            } elseif (strcasecmp($status, 'Approved') === 0 || strcasecmp($status, 'Confirmed') === 0) {
                $query .= " AND (status = 'Approved' OR status = 'Confirmed')";
            } else {
                $query .= " AND status = :status";
                $params['status'] = $status;
            }
        }
        if ($search) {
            $query .= " AND (name LIKE :search OR phone LIKE :search OR city LIKE :search OR lead_no LIKE :search OR email LIKE :search OR loan_type LIKE :search)";
            $params['search'] = "%{$search}%";
        }
        $query .= " ORDER BY id DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function parseDate($val, $fallback = null) {
        if (empty($val)) return $fallback;
        $val = trim((string)$val);
        if (preg_match('/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/', $val, $m)) {
            return sprintf('%04d-%02d-%02d', (int)$m[3], (int)$m[2], (int)$m[1]);
        }
        $ts = strtotime($val);
        if ($ts !== false && $ts > 0) {
            return date('Y-m-d', $ts);
        }
        return $fallback;
    }

    public function create(array $data) {
        $leadNo = 'LEAD-' . date('Ymd') . '-' . rand(1000, 9999);
        $amount = (float)ceil((float)preg_replace('/[^0-9.]/', '', (string)($data['amount'] ?? 0)));
        if ($amount <= 0) $amount = 50000;

        $sql = "INSERT INTO leads (lead_no, name, phone, email, city, loan_type, amount, status) VALUES (:lead_no, :name, :phone, :email, :city, :loan_type, :amount, 'Pending')";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'lead_no' => $leadNo,
            'name' => strtoupper(trim($data['name'])),
            'phone' => trim($data['phone']),
            'email' => !empty($data['email']) ? trim($data['email']) : null,
            'city' => !empty($data['city']) ? strtoupper(trim($data['city'])) : 'NARNAUL',
            'loan_type' => !empty($data['loan_type']) ? trim($data['loan_type']) : 'Personal Loan',
            'amount' => $amount
        ]);

        return [
            'id' => $this->db->lastInsertId(),
            'lead_no' => $leadNo
        ];
    }

    public function updateStatus(int $id, string $status) {
        $stmt = $this->db->prepare("UPDATE leads SET status = :status WHERE id = :id");
        return $stmt->execute(['status' => $status, 'id' => $id]);
    }

    public function batchImport(array $rows): array {
        $imported = 0;
        $errors = [];
        $insertedIds = [];

        // Flexible column mapping for external CSV exports
        $aliasMap = [
            'name' => [
                'name', 'applicant_name', 'client_name', 'full_name', 'customer_name', 'borrower_name', 'lead_name',
                'borrower_full_name', 'applicant_full_name', 'client_full_name', 'customer_full_name', 'primary_borrower',
                'borrower', 'customer', 'client', 'applicant', 'member_name'
            ],
            'phone' => [
                'phone', 'mobile', 'mobile_number', 'phone_number', 'contact', 'primary_phone', 'primary_mobile',
                'mobile_phone', 'contact_number', 'contact_no', 'mobile_no', 'phone_no', 'cell',
                'borrower_phone', 'customer_phone', 'borrower_mobile', 'customer_mobile', 'lead_phone', 'lead_mobile'
            ],
            'email' => ['email', 'email_address', 'mail', 'e_mail'],
            'city' => ['city', 'location', 'town', 'address', 'district', 'village', 'tehsil', 'city_location'],
            'loan_type' => ['loan_type', 'category', 'loan_category', 'purpose', 'product', 'type', 'product_type', 'loan_product'],
            'amount' => [
                'amount', 'loan_amount', 'principal', 'requested_amount', 'inquiry_amount',
                'sanctioned_principal', 'sanctioned_amount', 'sanction_principal', 'sanction_amount',
                'loan_amt', 'principal_amount', 'applied_amount', 'net_amount',
                'loan_amount_rs', 'amount_rs', 'sanctioned_principal_rs', 'loan_amount_in_rs',
                'requested_loan_amount', 'finance_amount', 'approved_amount', 'limit'
            ],
            'status' => ['status', 'lead_status', 'current_status'],
            'created_at' => ['created_at', 'created_date', 'date', 'lead_date', 'inquiry_date', 'application_date', 'applied_date']
        ];

        foreach ($rows as $index => $rawRow) {
            $rowNum = $index + 2; // 1-indexed, header is row 1
            $data = [];
            foreach ($rawRow as $k => $v) {
                $cleanKey = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '_', (string)$k), '_'));
                $alphaKey = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', (string)$k));
                $matchedCanonical = $cleanKey;

                foreach ($aliasMap as $canonical => $aliases) {
                    if ($cleanKey === $canonical || $alphaKey === strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $canonical))) {
                        $matchedCanonical = $canonical;
                        break;
                    }
                    foreach ($aliases as $alias) {
                        $aliasAlpha = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $alias));
                        if ($cleanKey === $alias || $alphaKey === $aliasAlpha) {
                            $matchedCanonical = $canonical;
                            break 2;
                        }
                    }
                }

                if (!isset($data[$matchedCanonical]) || ($data[$matchedCanonical] === '' && $v !== '')) {
                    $data[$matchedCanonical] = is_string($v) ? trim($v) : $v;
                }
            }

            // Fallback 1: Intelligently locate amount if not matched directly
            if (empty($data['amount']) || (float)preg_replace('/[^0-9.]/', '', (string)$data['amount']) <= 0) {
                foreach ($rawRow as $k => $v) {
                    $kLower = strtolower($k);
                    if (strpos($kLower, 'amount') !== false || strpos($kLower, 'principal') !== false || strpos($kLower, 'sanction') !== false || strpos($kLower, 'requested') !== false) {
                        $cand = (float)preg_replace('/[^0-9.]/', '', (string)$v);
                        if ($cand > 0) {
                            $data['amount'] = $cand;
                            break;
                        }
                    }
                }
            }

            // Fallback 2: Locate name if not matched directly
            if (empty($data['name'])) {
                foreach ($rawRow as $k => $v) {
                    $kLower = strtolower($k);
                    if ((strpos($kLower, 'name') !== false || strpos($kLower, 'borrower') !== false || strpos($kLower, 'customer') !== false || strpos($kLower, 'client') !== false || strpos($kLower, 'applicant') !== false) &&
                        strpos($kLower, 'father') === false && strpos($kLower, 'husband') === false && strpos($kLower, 'bank') === false &&
                        strpos($kLower, 'co_') === false && strpos($kLower, 'guarantor') === false) {
                        if (!empty(trim((string)$v))) {
                            $data['name'] = trim((string)$v);
                            break;
                        }
                    }
                }
            }

            // Fallback 3: Locate mobile phone if not matched directly
            if (empty($data['phone'])) {
                foreach ($rawRow as $k => $v) {
                    $kLower = strtolower($k);
                    if ((strpos($kLower, 'mobile') !== false || strpos($kLower, 'phone') !== false || strpos($kLower, 'contact') !== false || strpos($kLower, 'cell') !== false) &&
                        strpos($kLower, 'alt') === false && strpos($kLower, 'co_') === false && strpos($kLower, 'guarantor') === false) {
                        $digits = preg_replace('/\D/', '', (string)$v);
                        if (strlen($digits) >= 10) {
                            $data['phone'] = substr($digits, -10);
                            break;
                        }
                    }
                }
            }

            $name = $data['name'] ?? '';
            $phone = $data['phone'] ?? '';
            $amountRaw = $data['amount'] ?? '';
            $amount = (float)ceil((float)preg_replace('/[^0-9.]/', '', (string)$amountRaw));

            if (empty($name)) {
                $errors[] = "Row {$rowNum}: Missing Applicant Name";
                continue;
            }

            if (empty($phone)) {
                $errors[] = "Row {$rowNum} ({$name}): Missing Mobile Phone Number";
                continue;
            }

            if ($amount <= 0) {
                $amount = 50000;
            }

            try {
                $leadNo = 'LEAD-' . date('Ymd') . '-' . rand(10000, 99999);
                $status = !empty($data['status']) ? ucfirst(strtolower($data['status'])) : 'Pending';
                if (!in_array($status, ['Approved', 'Rejected', 'Pending', 'Completed'])) {
                    $status = 'Pending';
                }

                $createdAt = !empty($data['created_at'])
                    ? $this->parseDate($data['created_at'], date('Y-m-d H:i:s'))
                    : date('Y-m-d H:i:s');

                $stmt = $this->db->prepare("
                    INSERT INTO leads (lead_no, name, phone, email, city, loan_type, amount, status, created_at)
                    VALUES (:lead_no, :name, :phone, :email, :city, :loan_type, :amount, :status, :created_at)
                ");
                $stmt->execute([
                    'lead_no' => $leadNo,
                    'name' => strtoupper($name),
                    'phone' => $phone,
                    'email' => !empty($data['email']) ? trim($data['email']) : null,
                    'city' => !empty($data['city']) ? strtoupper(trim($data['city'])) : 'NARNAUL',
                    'loan_type' => !empty($data['loan_type']) ? trim($data['loan_type']) : 'Microfinance Loan',
                    'amount' => $amount,
                    'status' => $status,
                    'created_at' => $createdAt
                ]);

                $insertedIds[] = $this->db->lastInsertId();
                $imported++;
            } catch (Exception $e) {
                $errors[] = "Row {$rowNum} ({$name}): " . $e->getMessage();
            }
        }

        return [
            'total' => count($rows),
            'imported' => $imported,
            'skipped' => count($errors),
            'errors' => $errors,
            'imported_ids' => $insertedIds
        ];
    }
}
