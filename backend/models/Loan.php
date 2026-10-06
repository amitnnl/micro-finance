<?php
require_once __DIR__ . '/../config/Database.php';

class Loan {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getAll(?string $status = null, ?string $search = null) {
        $query = "SELECT * FROM loans WHERE 1=1";
        $params = [];

        if ($status) {
            $query .= " AND status = :status";
            $params['status'] = $status;
        }

        if ($search) {
            $query .= " AND (customer_name LIKE :search OR loan_no LIKE :search OR agreement_no LIKE :search OR customer_id LIKE :search OR phone LIKE :search)";
            $params['search'] = "%{$search}%";
        }

        $query .= " ORDER BY id DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function findById(int $id) {
        $stmt = $this->db->prepare("SELECT * FROM loans WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function create(array $data) {
        $principal = (float)ceil((float)$data['loan_amount']);
        if ($principal <= 0 || $principal > 200000) {
            throw new Exception("Microfinance loan amount must be between ₹1,000 and ₹2,00,000");
        }
        $rate = (float)($data['interest_rate'] ?? 35);
        $months = (int)($data['tenure_months'] ?? 24);

        // Compute Financial Math with Round Off Increasing (CEIL) - zero paisa
        $monthlyRate = ($rate / 12) / 100;
        $emi = ($principal * $monthlyRate * pow(1 + $monthlyRate, $months)) / (pow(1 + $monthlyRate, $months) - 1);
        $emiAmount = (float)ceil($emi);
        $totalPayment = (float)ceil($emiAmount * $months);
        $interestAmount = (float)ceil($totalPayment - $principal);
        // Customer ID: Reuse existing if borrower already on file by phone, or generate new
        $customerId = null;
        if (!empty($data['phone'])) {
            $custStmt = $this->db->prepare("SELECT customer_id FROM loans WHERE phone = :phone AND customer_id IS NOT NULL LIMIT 1");
            $custStmt->execute(['phone' => $data['phone']]);
            $existingCust = $custStmt->fetch();
            if ($existingCust && !empty($existingCust['customer_id'])) {
                $customerId = $existingCust['customer_id'];
            }
        }
        if (!$customerId) {
            $customerId = 'CUST-' . date('Y') . '-' . rand(10000, 99999);
        }

        $agreementNo = 'AGR-' . date('Y') . '-' . rand(10000, 99999);
        $loanNo = 'APP-' . date('Y') . '-' . rand(10000, 99999);

        $sql = "INSERT INTO loans (
            loan_no, customer_id, agreement_no, customer_name, father_husband_name, phone, alternate_phone, dob, gender, aadhaar_number, pan_number, address, district, state, pin_code,
            co_applicant_name, co_applicant_father_husband, co_applicant_phone, co_applicant_dob, co_applicant_gender, co_applicant_aadhaar, co_applicant_pan, co_applicant_address, co_applicant_district, co_applicant_state, co_applicant_pin,
            guarantor_name, guarantor_father_husband, guarantor_phone, guarantor_dob, guarantor_gender, guarantor_aadhaar, guarantor_pan, guarantor_address, guarantor_district, guarantor_state, guarantor_pin,
            loan_purpose_code, loan_purpose_title, loan_amount, interest_rate, tenure_months, emi_amount, total_payment, interest_amount, balance_outstanding,
            received_count, pending_count, status, employment_type, occupation, monthly_income_range, earning_members, bank_account_no, bank_ifsc, bank_micr, bank_name, account_holder_name, reference_name, reference_phone, reference_relation,
            doc_aadhaar, doc_pan, doc_photo, doc_passbook, doc_address_proof, doc_co_aadhaar, doc_guarantor_aadhaar,
            terms_accepted, additional_notes
        ) VALUES (
            :loan_no, :customer_id, :agreement_no, :customer_name, :father_husband_name, :phone, :alternate_phone, :dob, :gender, :aadhaar_number, :pan_number, :address, :district, :state, :pin_code,
            :co_applicant_name, :co_applicant_father_husband, :co_applicant_phone, :co_applicant_dob, :co_applicant_gender, :co_applicant_aadhaar, :co_applicant_pan, :co_applicant_address, :co_applicant_district, :co_applicant_state, :co_applicant_pin,
            :guarantor_name, :guarantor_father_husband, :guarantor_phone, :guarantor_dob, :guarantor_gender, :guarantor_aadhaar, :guarantor_pan, :guarantor_address, :guarantor_district, :guarantor_state, :guarantor_pin,
            :loan_purpose_code, :loan_purpose_title, :loan_amount, :interest_rate, :tenure_months, :emi_amount, :total_payment, :interest_amount, :balance_outstanding,
            0, :pending_count, 'Pending Approval', :employment_type, :occupation, :monthly_income_range, :earning_members, :bank_account_no, :bank_ifsc, :bank_micr, :bank_name, :account_holder_name, :reference_name, :reference_phone, :reference_relation,
            :doc_aadhaar, :doc_pan, :doc_photo, :doc_passbook, :doc_address_proof, :doc_co_aadhaar, :doc_guarantor_aadhaar,
            :terms_accepted, :additional_notes
        )";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'loan_no' => $loanNo,
            'customer_id' => $customerId,
            'agreement_no' => $agreementNo,
            'customer_name' => $data['customer_name'],
            'father_husband_name' => $data['father_husband_name'] ?? null,
            'phone' => $data['phone'],
            'alternate_phone' => $data['alternate_phone'] ?? null,
            'dob' => $data['dob'] ?? null,
            'gender' => $data['gender'] ?? 'Male',
            'aadhaar_number' => $data['aadhaar_number'] ?? null,
            'pan_number' => $data['pan_number'] ?? null,
            'address' => $data['address'] ?? null,
            'district' => $data['district'] ?? null,
            'state' => $data['state'] ?? 'Haryana',
            'pin_code' => $data['pin_code'] ?? null,

            'co_applicant_name' => $data['co_applicant_name'] ?? null,
            'co_applicant_father_husband' => $data['co_applicant_father_husband'] ?? null,
            'co_applicant_phone' => $data['co_applicant_phone'] ?? null,
            'co_applicant_dob' => $data['co_applicant_dob'] ?? null,
            'co_applicant_gender' => $data['co_applicant_gender'] ?? 'Male',
            'co_applicant_aadhaar' => $data['co_applicant_aadhaar'] ?? null,
            'co_applicant_pan' => $data['co_applicant_pan'] ?? null,
            'co_applicant_address' => $data['co_applicant_address'] ?? null,
            'co_applicant_district' => $data['co_applicant_district'] ?? null,
            'co_applicant_state' => $data['co_applicant_state'] ?? 'Haryana',
            'co_applicant_pin' => $data['co_applicant_pin'] ?? null,

            'guarantor_name' => $data['guarantor_name'] ?? null,
            'guarantor_father_husband' => $data['guarantor_father_husband'] ?? null,
            'guarantor_phone' => $data['guarantor_phone'] ?? null,
            'guarantor_dob' => $data['guarantor_dob'] ?? null,
            'guarantor_gender' => $data['guarantor_gender'] ?? 'Male',
            'guarantor_aadhaar' => $data['guarantor_aadhaar'] ?? null,
            'guarantor_pan' => $data['guarantor_pan'] ?? null,
            'guarantor_address' => $data['guarantor_address'] ?? null,
            'guarantor_district' => $data['guarantor_district'] ?? null,
            'guarantor_state' => $data['guarantor_state'] ?? 'Haryana',
            'guarantor_pin' => $data['guarantor_pin'] ?? null,

            'loan_purpose_code' => $data['loan_purpose_code'] ?? 'AH',
            'loan_purpose_title' => $data['loan_purpose_title'] ?? 'Animal Husbandry Loan',
            'loan_amount' => $principal,
            'interest_rate' => $rate,
            'tenure_months' => $months,
            'emi_amount' => $emiAmount,
            'total_payment' => $totalPayment,
            'interest_amount' => $interestAmount,
            'balance_outstanding' => $totalPayment,
            'pending_count' => $months,

            'employment_type' => $data['employment_type'] ?? 'Salaried',
            'occupation' => $data['occupation'] ?? null,
            'monthly_income_range' => $data['monthly_income_range'] ?? null,
            'earning_members' => (int)($data['earning_members'] ?? 1),
            'bank_account_no' => $data['bank_account_no'] ?? null,
            'bank_ifsc' => $data['bank_ifsc'] ?? null,
            'bank_micr' => $data['bank_micr'] ?? null,
            'bank_name' => $data['bank_name'] ?? null,
            'account_holder_name' => $data['account_holder_name'] ?? null,
            'reference_name' => $data['reference_name'] ?? null,
            'reference_phone' => $data['reference_phone'] ?? null,
            'reference_relation' => $data['reference_relation'] ?? null,

            'doc_aadhaar' => $data['doc_aadhaar'] ?? null,
            'doc_pan' => $data['doc_pan'] ?? null,
            'doc_photo' => $data['doc_photo'] ?? null,
            'doc_passbook' => $data['doc_passbook'] ?? null,
            'doc_address_proof' => $data['doc_address_proof'] ?? null,
            'doc_co_aadhaar' => $data['doc_co_aadhaar'] ?? null,
            'doc_guarantor_aadhaar' => $data['doc_guarantor_aadhaar'] ?? null,

            'terms_accepted' => !empty($data['terms_accepted']) ? 1 : 1,
            'additional_notes' => $data['additional_notes'] ?? null
        ]);

        return [
            'id' => $this->db->lastInsertId(),
            'loan_no' => $loanNo,
            'customer_id' => $customerId,
            'agreement_no' => $agreementNo,
            'emi_amount' => $emiAmount,
            'total_payment' => $totalPayment,
            'interest_amount' => $interestAmount,
            'status' => 'Pending Approval'
        ];
    }

    public function approve(int $id, string $notes = '') {
        $loan = $this->findById($id);
        if (!$loan) {
            throw new Exception("Loan record not found");
        }

        if ($loan['status'] === 'Active') {
            throw new Exception("Loan is already disbursed and active");
        }
        if ($loan['status'] === 'Approved') {
            throw new Exception("Loan application is already approved and ready for disbursement");
        }

        $stmt = $this->db->prepare("UPDATE loans SET status = 'Approved', approval_date = CURRENT_DATE, approval_notes = :notes WHERE id = :id");
        $stmt->execute([
            'notes' => $notes ?: 'Approved by Administrator',
            'id' => $id
        ]);

        return true;
    }

    public function reject(int $id, string $reason = '') {
        $loan = $this->findById($id);
        if (!$loan) {
            throw new Exception("Loan record not found");
        }

        if ($loan['status'] === 'Active') {
            throw new Exception("Cannot reject an active, disbursed loan");
        }

        $stmt = $this->db->prepare("UPDATE loans SET status = 'Rejected', approval_notes = :reason WHERE id = :id");
        $stmt->execute([
            'reason' => $reason ?: 'Application rejected during administrative verification',
            'id' => $id
        ]);

        return true;
    }

    public function disburse(int $id, string $date, string $mode, string $notes = '', string $reference = '') {
        $loan = $this->findById($id);
        if (!$loan) {
            throw new Exception("Loan record not found");
        }

        if ($loan['status'] === 'Active') {
            throw new Exception("Loan is already disbursed and active");
        }

        if ($loan['status'] !== 'Approved') {
            throw new Exception("Loan application must be Approved by Admin before funds can be disbursed. Current status: " . ($loan['status'] ?: 'Pending Approval'));
        }

        try {
            if (method_exists($this->db, 'beginTransaction')) {
                $this->db->beginTransaction();
            }

            // Update Loan Status, Disbursement Date, Mode, and Reference (UTR)
            $refValue = $reference ?: ($notes ?: '');
            $stmt = $this->db->prepare("UPDATE loans SET status = 'Active', disbursement_date = :date, disbursement_mode = :mode, disbursement_reference = :ref WHERE id = :id");
            $stmt->execute([
                'date' => $date,
                'mode' => $mode,
                'ref' => $refValue,
                'id' => $id
            ]);

            // Log Expense in Financial Records
            $desc = "Loan Disbursement for {$loan['loan_no']} ({$loan['customer_name']}) - Mode: {$mode}";
            if ($notes) {
                $desc .= " - {$notes}";
            }
            $stmtFin = $this->db->prepare("INSERT INTO financial_records (date, type, category, amount, description) VALUES (:date, 'EXPENSE', 'Loan Disbursement', :amount, :desc)");
            $stmtFin->execute([
                'date' => $date,
                'amount' => $loan['loan_amount'],
                'desc' => $desc
            ]);

            if (method_exists($this->db, 'commit')) {
                $this->db->commit();
            }
            return true;
        } catch (Exception $e) {
            if (method_exists($this->db, 'rollBack')) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function getStats() {
        $stmt = $this->db->prepare("
            SELECT 
                COUNT(*) as total_loans,
                COALESCE(SUM(CASE WHEN status IN ('Active', 'Closed') THEN loan_amount ELSE 0 END), 0) as total_disbursed,
                COALESCE(SUM(CASE WHEN status = 'Active' THEN balance_outstanding ELSE 0 END), 0) as total_outstanding,
                COALESCE((SELECT SUM(total_paid) FROM emi_payments WHERE status = 'Received'), 0) as total_received,
                COALESCE(SUM(interest_amount), 0) as expected_interest,
                COALESCE(AVG(tenure_months), 0) as avg_tenure,
                COALESCE(SUM(received_count), 0) as emis_cleared,
                SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_loans,
                SUM(CASE WHEN status = 'Pending Approval' THEN 1 ELSE 0 END) as pending_approvals,
                SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as pending_disbursements
            FROM loans
        ");
        $stmt->execute();
        $stats = $stmt->fetch();
        
        // Ensure null values are converted to 0
        return [
            'total_loans' => (int)($stats['total_loans'] ?? 0),
            'total_disbursed' => (float)ceil((float)($stats['total_disbursed'] ?? 0)),
            'total_outstanding' => (float)ceil((float)($stats['total_outstanding'] ?? 0)),
            'total_received' => (float)ceil((float)($stats['total_received'] ?? 0)),
            'expected_interest' => (float)ceil((float)($stats['expected_interest'] ?? 0)),
            'avg_tenure' => round((float)($stats['avg_tenure'] ?? 0), 1),
            'emis_cleared' => (int)($stats['emis_cleared'] ?? 0),
            'active_loans' => (int)($stats['active_loans'] ?? 0),
            'pending_approvals' => (int)($stats['pending_approvals'] ?? 0),
            'pending_disbursements' => (int)($stats['pending_disbursements'] ?? 0)
        ];
    }

    public function checkDocuments(array $docs, string $currentRole = 'applicant') {
        $rawAadhaar = trim($docs['aadhaar'] ?? '');
        $cleanAadhaar = preg_replace('/[^0-9]/', '', $rawAadhaar);

        $rawPan = strtoupper(trim($docs['pan'] ?? ''));
        $cleanPan = preg_replace('/[^A-Z0-9]/', '', $rawPan);

        $rawPhone = trim($docs['phone'] ?? '');
        $cleanPhone = preg_replace('/[^0-9]/', '', $rawPhone);
        if (strlen($cleanPhone) > 10) {
            $cleanPhone = substr($cleanPhone, -10);
        }

        if (empty($cleanAadhaar) && empty($cleanPan) && empty($cleanPhone)) {
            return [
                'found' => false,
                'summary' => [
                    'total_loans' => 0,
                    'active_loans' => 0,
                    'closed_loans' => 0,
                    'defaulted_loans' => 0,
                    'total_outstanding' => 0,
                    'risk_level' => 'FRESH'
                ],
                'records' => []
            ];
        }

        $conditions = [];
        $params = [];

        if (!empty($cleanAadhaar) && strlen($cleanAadhaar) >= 4) {
            $conditions[] = "(REPLACE(REPLACE(aadhaar_number, ' ', ''), '-', '') = :aadhaar_app OR REPLACE(REPLACE(co_applicant_aadhaar, ' ', ''), '-', '') = :aadhaar_co OR REPLACE(REPLACE(guarantor_aadhaar, ' ', ''), '-', '') = :aadhaar_guar)";
            $params['aadhaar_app'] = $cleanAadhaar;
            $params['aadhaar_co'] = $cleanAadhaar;
            $params['aadhaar_guar'] = $cleanAadhaar;
        }

        if (!empty($cleanPan) && strlen($cleanPan) >= 5) {
            $conditions[] = "(UPPER(REPLACE(pan_number, ' ', '')) = :pan_app OR UPPER(REPLACE(co_applicant_pan, ' ', '')) = :pan_co OR UPPER(REPLACE(guarantor_pan, ' ', '')) = :pan_guar)";
            $params['pan_app'] = $cleanPan;
            $params['pan_co'] = $cleanPan;
            $params['pan_guar'] = $cleanPan;
        }

        if (!empty($cleanPhone) && strlen($cleanPhone) >= 10) {
            $conditions[] = "(RIGHT(REPLACE(REPLACE(phone, ' ', ''), '-', ''), 10) = :phone_app OR RIGHT(REPLACE(REPLACE(co_applicant_phone, ' ', ''), '-', ''), 10) = :phone_co OR RIGHT(REPLACE(REPLACE(guarantor_phone, ' ', ''), '-', ''), 10) = :phone_guar)";
            $params['phone_app'] = $cleanPhone;
            $params['phone_co'] = $cleanPhone;
            $params['phone_guar'] = $cleanPhone;
        }

        if (empty($conditions)) {
            return [
                'found' => false,
                'summary' => [
                    'total_loans' => 0,
                    'active_loans' => 0,
                    'closed_loans' => 0,
                    'defaulted_loans' => 0,
                    'total_outstanding' => 0,
                    'risk_level' => 'FRESH'
                ],
                'records' => []
            ];
        }

        $sql = "SELECT id, loan_no, agreement_no, customer_id, customer_name, phone, aadhaar_number, pan_number,
                       co_applicant_name, co_applicant_phone, co_applicant_aadhaar, co_applicant_pan,
                       guarantor_name, guarantor_phone, guarantor_aadhaar, guarantor_pan,
                       loan_amount, balance_outstanding, status, emi_amount, tenure_months, created_at
                FROM loans 
                WHERE " . implode(' OR ', $conditions) . "
                ORDER BY id DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rows)) {
            return [
                'found' => false,
                'summary' => [
                    'total_loans' => 0,
                    'active_loans' => 0,
                    'closed_loans' => 0,
                    'defaulted_loans' => 0,
                    'total_outstanding' => 0,
                    'risk_level' => 'FRESH'
                ],
                'records' => []
            ];
        }

        $records = [];
        $activeLoans = 0;
        $closedLoans = 0;
        $defaultedLoans = 0;
        $totalOutstanding = 0;

        foreach ($rows as $r) {
            $matchedRoles = [];
            $matchedDocs = [];

            // Primary Borrower Checks
            $rAadhaar = preg_replace('/[^0-9]/', '', $r['aadhaar_number'] ?? '');
            $rPan = strtoupper(preg_replace('/[^A-Z0-9]/', '', $r['pan_number'] ?? ''));
            $rPhone = substr(preg_replace('/[^0-9]/', '', $r['phone'] ?? ''), -10);

            if (!empty($cleanAadhaar) && $rAadhaar === $cleanAadhaar) {
                $matchedRoles['Primary Borrower'] = true;
                $matchedDocs['Aadhaar'] = true;
            }
            if (!empty($cleanPan) && $rPan === $cleanPan) {
                $matchedRoles['Primary Borrower'] = true;
                $matchedDocs['PAN'] = true;
            }
            if (!empty($cleanPhone) && $rPhone === $cleanPhone) {
                $matchedRoles['Primary Borrower'] = true;
                $matchedDocs['Mobile'] = true;
            }

            // Co-Applicant Checks
            $rCoAadhaar = preg_replace('/[^0-9]/', '', $r['co_applicant_aadhaar'] ?? '');
            $rCoPan = strtoupper(preg_replace('/[^A-Z0-9]/', '', $r['co_applicant_pan'] ?? ''));
            $rCoPhone = substr(preg_replace('/[^0-9]/', '', $r['co_applicant_phone'] ?? ''), -10);

            if (!empty($cleanAadhaar) && $rCoAadhaar === $cleanAadhaar) {
                $matchedRoles['Co-Applicant'] = true;
                $matchedDocs['Aadhaar'] = true;
            }
            if (!empty($cleanPan) && $rCoPan === $cleanPan) {
                $matchedRoles['Co-Applicant'] = true;
                $matchedDocs['PAN'] = true;
            }
            if (!empty($cleanPhone) && $rCoPhone === $cleanPhone) {
                $matchedRoles['Co-Applicant'] = true;
                $matchedDocs['Mobile'] = true;
            }

            // Guarantor Checks
            $rGuarAadhaar = preg_replace('/[^0-9]/', '', $r['guarantor_aadhaar'] ?? '');
            $rGuarPan = strtoupper(preg_replace('/[^A-Z0-9]/', '', $r['guarantor_pan'] ?? ''));
            $rGuarPhone = substr(preg_replace('/[^0-9]/', '', $r['guarantor_phone'] ?? ''), -10);

            if (!empty($cleanAadhaar) && $rGuarAadhaar === $cleanAadhaar) {
                $matchedRoles['Guarantor'] = true;
                $matchedDocs['Aadhaar'] = true;
            }
            if (!empty($cleanPan) && $rGuarPan === $cleanPan) {
                $matchedRoles['Guarantor'] = true;
                $matchedDocs['PAN'] = true;
            }
            if (!empty($cleanPhone) && $rGuarPhone === $cleanPhone) {
                $matchedRoles['Guarantor'] = true;
                $matchedDocs['Mobile'] = true;
            }

            $st = $r['status'] ?? 'Active';
            if ($st === 'Active' || $st === 'Approved') {
                $activeLoans++;
                $totalOutstanding += (float)($r['balance_outstanding'] ?? 0);
            } elseif ($st === 'Closed') {
                $closedLoans++;
            } elseif ($st === 'Defaulted') {
                $defaultedLoans++;
                $totalOutstanding += (float)($r['balance_outstanding'] ?? 0);
            }

            $records[] = [
                'id' => $r['id'],
                'loan_no' => $r['loan_no'],
                'agreement_no' => $r['agreement_no'] ?: $r['loan_no'],
                'customer_id' => $r['customer_id'],
                'customer_name' => $r['customer_name'],
                'status' => $st,
                'matched_roles' => array_keys($matchedRoles),
                'matched_docs' => array_keys($matchedDocs),
                'loan_amount' => (float)$r['loan_amount'],
                'balance_outstanding' => (float)$r['balance_outstanding'],
                'tenure_months' => (int)$r['tenure_months'],
                'created_at' => $r['created_at']
            ];
        }

        $riskLevel = 'FRESH';
        if ($defaultedLoans > 0) {
            $riskLevel = 'DEFAULT_RISK';
        } elseif ($activeLoans > 0) {
            $riskLevel = 'ACTIVE_EXPOSURE';
        } elseif ($closedLoans > 0) {
            $riskLevel = 'GOOD_STANDING';
        }

        return [
            'found' => true,
            'summary' => [
                'total_loans' => count($records),
                'active_loans' => $activeLoans,
                'closed_loans' => $closedLoans,
                'defaulted_loans' => $defaultedLoans,
                'total_outstanding' => $totalOutstanding,
                'risk_level' => $riskLevel
            ],
            'records' => $records
        ];
    }

    public function batchImport(array $rows): array {
        $imported = 0;
        $errors = [];
        $insertedIds = [];

        $aliasMap = [
            'customer_name' => ['customer_name', 'name', 'borrower_name', 'client_name', 'applicant_name', 'applicant_full_name', 'borrower_full_name'],
            'father_husband_name' => ['father_husband_name', 'father_name', 'husband_name', 'father_husband', 'guardian_name', 'father_s_name'],
            'phone' => ['phone', 'mobile', 'mobile_number', 'phone_number', 'contact', 'primary_phone', 'primary_mobile'],
            'alternate_phone' => ['alternate_phone', 'alt_phone', 'alternate_mobile', 'alt_mobile', 'secondary_phone'],
            'dob' => ['dob', 'date_of_birth', 'birth_date', 'birthdate'],
            'gender' => ['gender', 'sex'],
            'aadhaar_number' => ['aadhaar_number', 'aadhaar', 'aadhar', 'aadhar_number', 'uid', 'aadhaar_no', 'aadhar_no'],
            'pan_number' => ['pan_number', 'pan', 'pan_no', 'pan_card'],
            'address' => ['address', 'residential_address', 'full_address', 'current_address', 'street_address'],
            'district' => ['district', 'city', 'town'],
            'state' => ['state', 'province'],
            'pin_code' => ['pin_code', 'pin', 'pincode', 'postal_code', 'zip', 'zip_code'],
            'loan_amount' => ['loan_amount', 'amount', 'principal', 'sanction_amount', 'loan_principal'],
            'interest_rate' => ['interest_rate', 'rate', 'interest', 'roi', 'annual_interest_rate'],
            'tenure_months' => ['tenure_months', 'tenure', 'months', 'duration', 'tenure_in_months', 'period'],
            'emi_amount' => ['emi_amount', 'emi', 'monthly_emi', 'installment'],
            'loan_purpose_title' => ['loan_purpose_title', 'purpose', 'loan_purpose', 'purpose_of_loan', 'loan_category'],
            'bank_name' => ['bank_name', 'bank', 'bank_title'],
            'bank_account_no' => ['bank_account_no', 'account_no', 'account_number', 'bank_account', 'bank_acct_no'],
            'bank_ifsc' => ['bank_ifsc', 'ifsc', 'ifsc_code'],
            'bank_micr' => ['bank_micr', 'micr', 'micr_code'],
            'status' => ['status', 'loan_status', 'current_status'],
            'disbursement_date' => ['disbursement_date', 'disbursed_on', 'disbursed_date', 'disbursal_date'],
            'agreement_no' => ['agreement_no', 'agreement_number', 'agreement', 'agr_no'],
            'customer_id' => ['customer_id', 'cust_id', 'cif', 'client_id', 'borrower_id'],
            'loan_no' => ['loan_no', 'application_no', 'app_no', 'loan_number', 'application_number'],
            'co_applicant_name' => ['co_applicant_name', 'co_applicant', 'coapplicant_name', 'nominee_name'],
            'co_applicant_phone' => ['co_applicant_phone', 'co_applicant_mobile'],
            'co_applicant_aadhaar' => ['co_applicant_aadhaar', 'co_applicant_aadhar'],
            'guarantor_name' => ['guarantor_name', 'guarantor', 'surety_name'],
            'guarantor_phone' => ['guarantor_phone', 'guarantor_mobile'],
            'guarantor_aadhaar' => ['guarantor_aadhaar', 'guarantor_aadhar'],
            'received_count' => ['received_count', 'emis_received', 'cleared_emis', 'paid_emis'],
            'balance_outstanding' => ['balance_outstanding', 'outstanding_balance', 'remaining_balance', 'balance']
        ];

        foreach ($rows as $index => $rawRow) {
            $rowNum = $index + 2; // 1-indexed, header is line 1
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

            // Basic validation
            $name = $data['customer_name'] ?? '';
            $phone = $data['phone'] ?? '';
            $amountRaw = $data['loan_amount'] ?? '';
            $principal = (float)ceil((float)preg_replace('/[^0-9.]/', '', (string)$amountRaw));

            if (empty($name)) {
                $errors[] = "Row {$rowNum}: Missing Borrower / Customer Name";
                continue;
            }
            if (empty($phone)) {
                $errors[] = "Row {$rowNum} ({$name}): Missing Mobile Phone Number";
                continue;
            }
            if ($principal <= 0) {
                $errors[] = "Row {$rowNum} ({$name}): Invalid or missing Loan Amount (Must be greater than 0)";
                continue;
            }

            try {
                $rate = !empty($data['interest_rate']) ? (float)$data['interest_rate'] : 35.0;
                $months = !empty($data['tenure_months']) ? (int)$data['tenure_months'] : 24;
                if ($months <= 0) $months = 24;

                // Compute Financial Math with CEIL
                $monthlyRate = ($rate / 12) / 100;
                $computedEmi = ($principal * $monthlyRate * pow(1 + $monthlyRate, $months)) / (pow(1 + $monthlyRate, $months) - 1);
                $emiAmount = !empty($data['emi_amount']) ? (float)ceil((float)$data['emi_amount']) : (float)ceil($computedEmi);
                $totalPayment = (float)ceil($emiAmount * $months);
                $interestAmount = (float)ceil($totalPayment - $principal);

                // Received count and outstanding balance
                $recCount = isset($data['received_count']) && $data['received_count'] !== '' ? (int)$data['received_count'] : 0;
                if (isset($data['balance_outstanding']) && $data['balance_outstanding'] !== '') {
                    $balance = (float)ceil((float)$data['balance_outstanding']);
                } else {
                    $balance = (float)ceil(max(0, $totalPayment - ($emiAmount * $recCount)));
                }

                // Customer ID: Reuse if exists by phone, or use provided, or generate new
                $customerId = $data['customer_id'] ?? null;
                if (!$customerId) {
                    $custStmt = $this->db->prepare("SELECT customer_id FROM loans WHERE phone = :phone AND customer_id IS NOT NULL LIMIT 1");
                    $custStmt->execute(['phone' => $phone]);
                    $existingCust = $custStmt->fetch();
                    if ($existingCust && !empty($existingCust['customer_id'])) {
                        $customerId = $existingCust['customer_id'];
                    } else {
                        $customerId = 'CUST-' . date('Y') . '-' . rand(10000, 99999);
                    }
                }

                $loanNo = !empty($data['loan_no']) ? $data['loan_no'] : 'APP-' . date('Y') . '-' . rand(10000, 99999);
                $agreementNo = !empty($data['agreement_no']) ? $data['agreement_no'] : 'AGR-' . date('Y') . '-' . rand(10000, 99999);

                $status = !empty($data['status']) ? ucfirst(strtolower($data['status'])) : 'Active';
                $validStatuses = ['Pending Approval', 'Approved', 'Active', 'Closed', 'Rejected', 'Overdue'];
                if (!in_array($status, $validStatuses)) {
                    $status = 'Active';
                }

                $disbDate = !empty($data['disbursement_date']) ? $data['disbursement_date'] : ($status === 'Active' || $status === 'Closed' ? date('Y-m-d') : null);

                $sql = "INSERT INTO loans (
                    loan_no, customer_id, agreement_no, customer_name, father_husband_name, phone, alternate_phone, dob, gender, aadhaar_number, pan_number, address, district, state, pin_code,
                    co_applicant_name, co_applicant_phone, co_applicant_aadhaar,
                    guarantor_name, guarantor_phone, guarantor_aadhaar,
                    loan_purpose_code, loan_purpose_title, loan_amount, interest_rate, tenure_months, emi_amount, total_payment, interest_amount, balance_outstanding,
                    received_count, pending_count, status, disbursement_date, disbursement_mode,
                    bank_account_no, bank_ifsc, bank_micr, bank_name, account_holder_name,
                    terms_accepted, additional_notes
                ) VALUES (
                    :loan_no, :customer_id, :agreement_no, :customer_name, :father_husband_name, :phone, :alternate_phone, :dob, :gender, :aadhaar_number, :pan_number, :address, :district, :state, :pin_code,
                    :co_applicant_name, :co_applicant_phone, :co_applicant_aadhaar,
                    :guarantor_name, :guarantor_phone, :guarantor_aadhaar,
                    :loan_purpose_code, :loan_purpose_title, :loan_amount, :interest_rate, :tenure_months, :emi_amount, :total_payment, :interest_amount, :balance_outstanding,
                    :received_count, :pending_count, :status, :disbursement_date, :disbursement_mode,
                    :bank_account_no, :bank_ifsc, :bank_micr, :bank_name, :account_holder_name,
                    1, :additional_notes
                )";

                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    'loan_no' => $loanNo,
                    'customer_id' => $customerId,
                    'agreement_no' => $agreementNo,
                    'customer_name' => strtoupper($name),
                    'father_husband_name' => !empty($data['father_husband_name']) ? strtoupper($data['father_husband_name']) : null,
                    'phone' => $phone,
                    'alternate_phone' => $data['alternate_phone'] ?? null,
                    'dob' => !empty($data['dob']) ? $data['dob'] : null,
                    'gender' => !empty($data['gender']) ? ucfirst(strtolower($data['gender'])) : 'Male',
                    'aadhaar_number' => $data['aadhaar_number'] ?? null,
                    'pan_number' => !empty($data['pan_number']) ? strtoupper($data['pan_number']) : null,
                    'address' => $data['address'] ?? null,
                    'district' => $data['district'] ?? null,
                    'state' => $data['state'] ?? 'Haryana',
                    'pin_code' => $data['pin_code'] ?? null,

                    'co_applicant_name' => !empty($data['co_applicant_name']) ? strtoupper($data['co_applicant_name']) : null,
                    'co_applicant_phone' => $data['co_applicant_phone'] ?? null,
                    'co_applicant_aadhaar' => $data['co_applicant_aadhaar'] ?? null,

                    'guarantor_name' => !empty($data['guarantor_name']) ? strtoupper($data['guarantor_name']) : null,
                    'guarantor_phone' => $data['guarantor_phone'] ?? null,
                    'guarantor_aadhaar' => $data['guarantor_aadhaar'] ?? null,

                    'loan_purpose_code' => 'AH',
                    'loan_purpose_title' => $data['loan_purpose_title'] ?? 'Microfinance Business / Personal Loan',
                    'loan_amount' => $principal,
                    'interest_rate' => $rate,
                    'tenure_months' => $months,
                    'emi_amount' => $emiAmount,
                    'total_payment' => $totalPayment,
                    'interest_amount' => $interestAmount,
                    'balance_outstanding' => $balance,
                    'received_count' => $recCount,
                    'pending_count' => max(0, $months - $recCount),
                    'status' => $status,
                    'disbursement_date' => $disbDate,
                    'disbursement_mode' => $data['disbursement_mode'] ?? 'Bank Transfer',

                    'bank_account_no' => $data['bank_account_no'] ?? null,
                    'bank_ifsc' => !empty($data['bank_ifsc']) ? strtoupper($data['bank_ifsc']) : null,
                    'bank_micr' => $data['bank_micr'] ?? null,
                    'bank_name' => !empty($data['bank_name']) ? strtoupper($data['bank_name']) : null,
                    'account_holder_name' => !empty($data['account_holder_name']) ? strtoupper($data['account_holder_name']) : strtoupper($name),
                    'additional_notes' => 'Imported via CSV on ' . date('Y-m-d H:i:s')
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
