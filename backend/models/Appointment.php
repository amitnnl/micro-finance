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
            $query .= " AND status = :status";
            $params['status'] = $status;
        }
        if ($search) {
            $query .= " AND (client_name LIKE :search OR phone LIKE :search OR appointment_no LIKE :search OR aadhaar_number LIKE :search OR city LIKE :search OR address LIKE :search OR email LIKE :search)";
            $params['search'] = "%{$search}%";
        }
        $query .= " ORDER BY id DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function create(array $data) {
        $aptNo = 'APT-' . rand(2000, 8999);
        $sql = "INSERT INTO appointments (appointment_no, client_name, phone, aadhaar_number, loan_amount, lead_date, source_type, email, address, city, appointment_date, status)
                VALUES (:apt_no, :name, :phone, :aadhaar, :loan_amount, :lead_date, :source_type, :email, :address, :city, :apt_date, 'Pending')";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'apt_no' => $aptNo,
            'name' => $data['client_name'],
            'phone' => $data['phone'],
            'aadhaar' => $data['aadhaar_number'] ?? null,
            'loan_amount' => (float)($data['loan_amount'] ?? 0),
            'lead_date' => $data['lead_date'] ?? date('Y-m-d'),
            'source_type' => $data['source_type'] ?? 'Lead',
            'email' => $data['email'] ?? null,
            'address' => $data['address'] ?? null,
            'city' => $data['city'] ?? null,
            'apt_date' => $data['appointment_date'] ?? date('Y-m-d')
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
            'client_name' => ['client_name', 'name', 'applicant_name', 'full_name', 'customer_name', 'lead_name'],
            'phone' => ['phone', 'mobile', 'mobile_number', 'phone_number', 'contact', 'primary_phone'],
            'aadhaar_number' => ['aadhaar_number', 'aadhaar', 'aadhar', 'aadhar_number', 'uid'],
            'loan_amount' => ['loan_amount', 'amount', 'principal', 'requested_amount', 'inquiry_amount'],
            'lead_date' => ['lead_date', 'date', 'inquiry_date', 'created_at'],
            'source_type' => ['source_type', 'source', 'lead_source', 'channel'],
            'email' => ['email', 'email_address', 'mail'],
            'address' => ['address', 'full_address', 'street_address'],
            'city' => ['city', 'location', 'town', 'district', 'village'],
            'appointment_date' => ['appointment_date', 'apt_date', 'visit_date'],
            'status' => ['status', 'lead_status']
        ];

        foreach ($rows as $index => $rawRow) {
            $rowNum = $index + 2;
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

            $name = $data['client_name'] ?? '';
            $phone = $data['phone'] ?? '';
            $amountRaw = $data['loan_amount'] ?? '50000';
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

            if ($amount > 200000) {
                $amount = 200000;
            }

            try {
                $aptNo = 'APT-' . rand(2000, 8999);
                $status = in_array(ucfirst(strtolower($data['status'] ?? '')), ['Approved', 'Rejected', 'Pending'])
                    ? ucfirst(strtolower($data['status']))
                    : 'Pending';

                $source = in_array(ucfirst(strtolower($data['source_type'] ?? '')), ['Lead', 'Referral', 'Direct'])
                    ? ucfirst(strtolower($data['source_type']))
                    : 'Lead';

                $leadDate = !empty($data['lead_date']) ? substr($data['lead_date'], 0, 10) : date('Y-m-d');
                $aptDate = !empty($data['appointment_date']) ? substr($data['appointment_date'], 0, 10) : $leadDate;

                $stmt = $this->db->prepare("
                    INSERT INTO appointments (appointment_no, client_name, phone, aadhaar_number, loan_amount, lead_date, source_type, email, address, city, appointment_date, status)
                    VALUES (:apt_no, :name, :phone, :aadhaar, :loan_amount, :lead_date, :source_type, :email, :address, :city, :apt_date, :status)
                ");
                $stmt->execute([
                    'apt_no' => $aptNo,
                    'name' => strtoupper($name),
                    'phone' => $phone,
                    'aadhaar' => !empty($data['aadhaar_number']) ? $data['aadhaar_number'] : null,
                    'loan_amount' => $amount,
                    'lead_date' => $leadDate,
                    'source_type' => $source,
                    'email' => !empty($data['email']) ? $data['email'] : null,
                    'address' => !empty($data['address']) ? $data['address'] : null,
                    'city' => !empty($data['city']) ? strtoupper($data['city']) : 'NARNAUL',
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
