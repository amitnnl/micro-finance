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
            $query .= " AND status = :status";
            $params['status'] = $status;
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

    public function create(array $data) {
        $leadNo = 'LEAD-' . rand(1000, 9999);
        $sql = "INSERT INTO leads (lead_no, name, phone, email, city, loan_type, amount, status) VALUES (:lead_no, :name, :phone, :email, :city, :loan_type, :amount, 'Pending')";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'lead_no' => $leadNo,
            'name' => $data['name'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'city' => $data['city'] ?? null,
            'loan_type' => $data['loan_type'] ?? 'Personal Loan',
            'amount' => (float)($data['amount'] ?? 0)
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
            'name' => ['name', 'applicant_name', 'client_name', 'full_name', 'customer_name', 'borrower_name', 'lead_name'],
            'phone' => ['phone', 'mobile', 'mobile_number', 'phone_number', 'contact', 'primary_phone', 'mobile_no'],
            'email' => ['email', 'email_address', 'mail'],
            'city' => ['city', 'location', 'town', 'address', 'district', 'village'],
            'loan_type' => ['loan_type', 'category', 'loan_category', 'purpose', 'product', 'type'],
            'amount' => ['amount', 'loan_amount', 'principal', 'requested_amount', 'inquiry_amount'],
            'status' => ['status', 'lead_status']
        ];

        foreach ($rows as $index => $rawRow) {
            $rowNum = $index + 2; // 1-indexed, header is row 1
            $data = [];
            foreach ($rawRow as $k => $v) {
                $cleanKey = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '_', (string)$k), '_'));
                $matchedCanonical = $cleanKey;
                foreach ($aliasMap as $canonical => $aliases) {
                    if (in_array($cleanKey, $aliases)) {
                        $matchedCanonical = $canonical;
                        break;
                    }
                }
                $data[$matchedCanonical] = is_string($v) ? trim($v) : $v;
            }

            $name = $data['name'] ?? '';
            $phone = $data['phone'] ?? '';
            $amountRaw = $data['amount'] ?? '50000';
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

            if ($amount > 200000) {
                $amount = 200000; // Cap at microfinance compliance limit
            }

            try {
                $leadNo = 'LEAD-' . rand(1000, 9999);
                $status = in_array(ucfirst(strtolower($data['status'] ?? '')), ['Approved', 'Rejected', 'Pending'])
                    ? ucfirst(strtolower($data['status']))
                    : 'Pending';

                $stmt = $this->db->prepare("
                    INSERT INTO leads (lead_no, name, phone, email, city, loan_type, amount, status)
                    VALUES (:lead_no, :name, :phone, :email, :city, :loan_type, :amount, :status)
                ");
                $stmt->execute([
                    'lead_no' => $leadNo,
                    'name' => strtoupper($name),
                    'phone' => $phone,
                    'email' => !empty($data['email']) ? $data['email'] : null,
                    'city' => !empty($data['city']) ? strtoupper($data['city']) : 'NARNAUL',
                    'loan_type' => !empty($data['loan_type']) ? $data['loan_type'] : 'Microfinance Loan',
                    'amount' => $amount,
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
