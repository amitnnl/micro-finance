<?php
require_once __DIR__ . '/../config/Database.php';

class Appointment {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getAll(?string $status = null, ?string $search = null) {
        $query = "SELECT * FROM appointments WHERE 1=1";
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
            $query .= " AND (client_name LIKE :search OR phone LIKE :search OR appointment_no LIKE :search OR aadhaar_number LIKE :search OR city LIKE :search OR address LIKE :search OR email LIKE :search OR referral_name LIKE :search)";
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
        $aptNo = 'APT-' . date('Ymd') . '-' . rand(1000, 9999);
        $leadDate = !empty($data['lead_date']) ? $this->parseDate($data['lead_date'], date('Y-m-d')) : date('Y-m-d');
        $aptDate = !empty($data['appointment_date']) ? $this->parseDate($data['appointment_date'], $leadDate) : $leadDate;
        $loanAmount = (float)ceil((float)preg_replace('/[^0-9.]/', '', (string)($data['loan_amount'] ?? 0)));
        if ($loanAmount <= 0) $loanAmount = 50000;

        $rawSource = !empty($data['source_type']) ? trim($data['source_type']) : 'Direct';
        $sourceType = (strcasecmp($rawSource, 'Referral') === 0 || strcasecmp($rawSource, 'referal') === 0) ? 'Referral' : 'Direct';
        $referralName = ($sourceType === 'Referral' && !empty($data['referral_name'])) ? strtoupper(trim($data['referral_name'])) : null;

        $sql = "INSERT INTO appointments (appointment_no, client_name, phone, aadhaar_number, loan_amount, lead_date, source_type, referral_name, email, address, city, appointment_date, status)
                VALUES (:apt_no, :name, :phone, :aadhaar, :loan_amount, :lead_date, :source_type, :referral_name, :email, :address, :city, :apt_date, 'Pending')";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'apt_no' => $aptNo,
            'name' => strtoupper(trim($data['client_name'])),
            'phone' => trim($data['phone']),
            'aadhaar' => !empty($data['aadhaar_number']) ? trim($data['aadhaar_number']) : null,
            'loan_amount' => $loanAmount,
            'lead_date' => $leadDate,
            'source_type' => $sourceType,
            'referral_name' => $referralName,
            'email' => !empty($data['email']) ? trim($data['email']) : null,
            'address' => !empty($data['address']) ? trim($data['address']) : null,
            'city' => !empty($data['city']) ? strtoupper(trim($data['city'])) : 'NARNAUL',
            'apt_date' => $aptDate
        ]);

        return [
            'id' => $this->db->lastInsertId(),
            'appointment_no' => $aptNo
        ];
    }

    public function updateStatus(int $id, string $status, ?string $reason = null) {
        $sql = "UPDATE appointments SET status = :status, reject_reason = :reason WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'status' => $status,
            'reason' => $reason,
            'id' => $id
        ]);
    }

    public function batchImport(array $rows): array {
        $imported = 0;
        $errors = [];
        $insertedIds = [];

        $aliasMap = [
            'client_name' => [
                'client_name', 'name', 'applicant_name', 'full_name', 'customer_name', 'lead_name',
                'borrower_full_name', 'borrower_name', 'applicant_full_name', 'client_full_name',
                'customer_full_name', 'primary_borrower', 'borrower', 'customer', 'client', 'applicant', 'member_name'
            ],
            'phone' => [
                'phone', 'mobile', 'mobile_number', 'phone_number', 'contact', 'primary_phone', 'primary_mobile',
                'mobile_phone', 'contact_number', 'contact_no', 'mobile_no', 'phone_no', 'cell',
                'borrower_phone', 'customer_phone', 'borrower_mobile', 'customer_mobile', 'lead_phone', 'lead_mobile'
            ],
            'aadhaar_number' => [
                'aadhaar_number', 'aadhaar', 'aadhar', 'aadhar_number', 'uid', 'uidai', 'aadhaar_no', 'aadhar_no',
                'borrower_aadhaar', 'client_aadhaar'
            ],
            'loan_amount' => [
                'loan_amount', 'amount', 'principal', 'requested_amount', 'inquiry_amount',
                'sanctioned_principal', 'sanctioned_amount', 'sanction_principal', 'sanction_amount',
                'loan_amt', 'principal_amount', 'applied_amount', 'net_amount',
                'loan_amount_rs', 'amount_rs', 'sanctioned_principal_rs', 'loan_amount_in_rs',
                'requested_loan_amount', 'finance_amount', 'approved_amount', 'limit'
            ],
            'lead_date' => [
                'lead_date', 'date', 'inquiry_date', 'origination_date', 'created_at', 'created_date',
                'application_date', 'applied_date', 'submission_date', 'date_of_lead'
            ],
            'source_type' => [
                'source_type', 'source', 'lead_source', 'channel', 'referral_source'
            ],
            'email' => [
                'email', 'email_address', 'mail', 'e_mail'
            ],
            'address' => [
                'address', 'full_address', 'residential_address', 'current_address', 'street_address'
            ],
            'city' => [
                'city', 'location', 'town', 'district', 'village', 'tehsil', 'city_location', 'city_town'
            ],
            'appointment_date' => [
                'appointment_date', 'apt_date', 'visit_date', 'meeting_date'
            ],
            'status' => [
                'status', 'lead_status', 'current_status'
            ],
            'reject_reason' => [
                'reject_reason', 'rejection_reason', 'reason'
            ],
            'referral_name' => [
                'referral_name', 'referrer', 'referred_by', 'referral', 'ref_name', 'reference'
            ]
        ];

        foreach ($rows as $index => $rawRow) {
            $rowNum = $index + 2;
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

            // Fallback 1: Intelligently locate loan_amount if not matched directly
            if (empty($data['loan_amount']) || (float)preg_replace('/[^0-9.]/', '', (string)$data['loan_amount']) <= 0) {
                foreach ($rawRow as $k => $v) {
                    $kLower = strtolower($k);
                    if (strpos($kLower, 'amount') !== false || strpos($kLower, 'principal') !== false || strpos($kLower, 'sanction') !== false || strpos($kLower, 'requested') !== false) {
                        $cand = (float)preg_replace('/[^0-9.]/', '', (string)$v);
                        if ($cand > 0) {
                            $data['loan_amount'] = $cand;
                            break;
                        }
                    }
                }
            }

            // Fallback 2: Locate client_name if not matched directly
            if (empty($data['client_name'])) {
                foreach ($rawRow as $k => $v) {
                    $kLower = strtolower($k);
                    if ((strpos($kLower, 'name') !== false || strpos($kLower, 'borrower') !== false || strpos($kLower, 'customer') !== false || strpos($kLower, 'client') !== false || strpos($kLower, 'applicant') !== false) &&
                        strpos($kLower, 'father') === false && strpos($kLower, 'husband') === false && strpos($kLower, 'bank') === false &&
                        strpos($kLower, 'co_') === false && strpos($kLower, 'guarantor') === false) {
                        if (!empty(trim((string)$v))) {
                            $data['client_name'] = trim((string)$v);
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

            // Fallback 4: Locate Aadhaar number if not matched directly
            if (empty($data['aadhaar_number'])) {
                foreach ($rawRow as $k => $v) {
                    $kLower = strtolower($k);
                    if (strpos($kLower, 'aadhaar') !== false || strpos($kLower, 'aadhar') !== false || strpos($kLower, 'uid') !== false) {
                        $digits = preg_replace('/\D/', '', (string)$v);
                        if (strlen($digits) === 12) {
                            $data['aadhaar_number'] = $digits;
                            break;
                        }
                    }
                }
            }

            $name = $data['client_name'] ?? '';
            $phone = $data['phone'] ?? '';
            $amountRaw = $data['loan_amount'] ?? '';
            $amount = (float)ceil((float)preg_replace('/[^0-9.]/', '', (string)$amountRaw));

            if (empty($name)) {
                $errors[] = "Row {$rowNum}: Missing Client Name";
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
                $aptNo = 'APT-' . date('Ymd') . '-' . rand(10000, 99999);
                $status = !empty($data['status']) ? ucfirst(strtolower($data['status'])) : 'Pending';
                if (!in_array($status, ['Approved', 'Rejected', 'Pending', 'Completed'])) {
                    $status = 'Pending';
                }

                $rawSource = !empty($data['source_type']) ? trim($data['source_type']) : 'Direct';
                $source = (strcasecmp($rawSource, 'Referral') === 0 || strcasecmp($rawSource, 'referal') === 0) ? 'Referral' : 'Direct';
                $refName = ($source === 'Referral' && !empty($data['referral_name'])) ? strtoupper(trim($data['referral_name'])) : null;
                $leadDate = $this->parseDate($data['lead_date'] ?? null, date('Y-m-d'));
                $aptDate = $this->parseDate($data['appointment_date'] ?? null, $leadDate);

                $stmt = $this->db->prepare("
                    INSERT INTO appointments (appointment_no, client_name, phone, aadhaar_number, loan_amount, lead_date, source_type, referral_name, email, address, city, appointment_date, status)
                    VALUES (:apt_no, :name, :phone, :aadhaar, :loan_amount, :lead_date, :source_type, :referral_name, :email, :address, :city, :apt_date, :status)
                ");
                $stmt->execute([
                    'apt_no' => $aptNo,
                    'name' => strtoupper($name),
                    'phone' => $phone,
                    'aadhaar' => !empty($data['aadhaar_number']) ? trim($data['aadhaar_number']) : null,
                    'loan_amount' => $amount,
                    'lead_date' => $leadDate,
                    'source_type' => $source,
                    'referral_name' => $refName,
                    'email' => !empty($data['email']) ? trim($data['email']) : null,
                    'address' => !empty($data['address']) ? trim($data['address']) : null,
                    'city' => !empty($data['city']) ? strtoupper(trim($data['city'])) : 'NARNAUL',
                    'apt_date' => $aptDate,
                    'status' => $status
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
