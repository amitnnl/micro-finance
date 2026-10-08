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
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $createdDate = !empty($r['created_at']) ? substr($r['created_at'], 0, 10) : date('Y-m-d');
            $r['application_date'] = !empty($r['application_date']) ? $r['application_date'] : $createdDate;
            $r['lead_date'] = !empty($r['lead_date']) ? $r['lead_date'] : $r['application_date'];
        }
        unset($r);
        return $rows;
    }

    public function findById(int $id) {
        $stmt = $this->db->prepare("SELECT * FROM loans WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $loan = $stmt->fetch();
        if ($loan) {
            $createdDate = !empty($loan['created_at']) ? substr($loan['created_at'], 0, 10) : date('Y-m-d');
            $loan['application_date'] = !empty($loan['application_date']) ? $loan['application_date'] : $createdDate;
            $loan['lead_date'] = !empty($loan['lead_date']) ? $loan['lead_date'] : $loan['application_date'];
        }
        return $loan;
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

        $leadDate = !empty($data['lead_date']) ? substr($data['lead_date'], 0, 10) : null;
        $appDate = !empty($data['application_date']) ? substr($data['application_date'], 0, 10) : date('Y-m-d');
        if (empty($leadDate)) {
            $leadDate = $appDate;
        }

        $sql = "INSERT INTO loans (
            loan_no, customer_id, agreement_no, customer_name, father_husband_name, phone, alternate_phone, dob, gender, aadhaar_number, pan_number, address, district, state, pin_code,
            co_applicant_name, co_applicant_father_husband, co_applicant_phone, co_applicant_dob, co_applicant_gender, co_applicant_aadhaar, co_applicant_pan, co_applicant_address, co_applicant_district, co_applicant_state, co_applicant_pin,
            guarantor_name, guarantor_father_husband, guarantor_phone, guarantor_dob, guarantor_gender, guarantor_aadhaar, guarantor_pan, guarantor_address, guarantor_district, guarantor_state, guarantor_pin,
            loan_purpose_code, loan_purpose_title, loan_amount, interest_rate, tenure_months, emi_amount, total_payment, interest_amount, balance_outstanding,
            received_count, pending_count, status, lead_date, application_date, employment_type, occupation, monthly_income_range, earning_members, bank_account_no, bank_ifsc, bank_micr, bank_name, account_holder_name, reference_name, reference_phone, reference_relation,
            doc_aadhaar, doc_pan, doc_photo, doc_passbook, doc_address_proof, doc_co_aadhaar, doc_guarantor_aadhaar,
            terms_accepted, additional_notes
        ) VALUES (
            :loan_no, :customer_id, :agreement_no, :customer_name, :father_husband_name, :phone, :alternate_phone, :dob, :gender, :aadhaar_number, :pan_number, :address, :district, :state, :pin_code,
            :co_applicant_name, :co_applicant_father_husband, :co_applicant_phone, :co_applicant_dob, :co_applicant_gender, :co_applicant_aadhaar, :co_applicant_pan, :co_applicant_address, :co_applicant_district, :co_applicant_state, :co_applicant_pin,
            :guarantor_name, :guarantor_father_husband, :guarantor_phone, :guarantor_dob, :guarantor_gender, :guarantor_aadhaar, :guarantor_pan, :guarantor_address, :guarantor_district, :guarantor_state, :guarantor_pin,
            :loan_purpose_code, :loan_purpose_title, :loan_amount, :interest_rate, :tenure_months, :emi_amount, :total_payment, :interest_amount, :balance_outstanding,
            0, :pending_count, 'Pending Approval', :lead_date, :application_date, :employment_type, :occupation, :monthly_income_range, :earning_members, :bank_account_no, :bank_ifsc, :bank_micr, :bank_name, :account_holder_name, :reference_name, :reference_phone, :reference_relation,
            :doc_aadhaar, :doc_pan, :doc_photo, :doc_passbook, :doc_address_proof, :doc_co_aadhaar, :doc_guarantor_aadhaar,
            :terms_accepted, :additional_notes
        )";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'loan_no' => $loanNo,
            'customer_id' => $customerId,
            'agreement_no' => $agreementNo,
            'lead_date' => $leadDate,
            'application_date' => $appDate,
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

    public function update(int $id, array $data) {
        $loan = $this->findById($id);
        if (!$loan) {
            throw new Exception("Loan record not found");
        }

        // Strict Post-Approval Protection: Applications cannot be edited after approval
        $editableStatuses = ['Pending Approval', 'Draft', 'Pending'];
        if (!in_array($loan['status'], $editableStatuses)) {
            throw new Exception("This loan application has already been approved (Status: {$loan['status']}) and is strictly locked. Edits are not permitted after credit approval.");
        }

        $principal = (float)ceil((float)($data['loan_amount'] ?? $loan['loan_amount']));
        if ($principal < 1000 || $principal > 200000) {
            throw new Exception("Microfinance loan amount must be between ₹1,000 and ₹2,00,000");
        }
        $rate = (float)($data['interest_rate'] ?? $loan['interest_rate'] ?? 14.5);
        $months = (int)($data['tenure_months'] ?? $loan['tenure_months'] ?? 24);

        // Recalculate financial breakdown
        $monthlyRate = ($rate / 12) / 100;
        $emi = ($principal * $monthlyRate * pow(1 + $monthlyRate, $months)) / (pow(1 + $monthlyRate, $months) - 1);
        $emiAmount = (float)ceil($emi);
        $totalPayment = (float)ceil($emiAmount * $months);
        $interestAmount = (float)ceil($totalPayment - $principal);

        $leadDate = !empty($data['lead_date']) ? substr($data['lead_date'], 0, 10) : $loan['lead_date'];
        $appDate = !empty($data['application_date']) ? substr($data['application_date'], 0, 10) : $loan['application_date'];

        $sql = "UPDATE loans SET
            customer_name = :customer_name,
            father_husband_name = :father_husband_name,
            phone = :phone,
            alternate_phone = :alternate_phone,
            dob = :dob,
            gender = :gender,
            aadhaar_number = :aadhaar_number,
            pan_number = :pan_number,
            address = :address,
            district = :district,
            state = :state,
            pin_code = :pin_code,

            co_applicant_name = :co_applicant_name,
            co_applicant_father_husband = :co_applicant_father_husband,
            co_applicant_phone = :co_applicant_phone,
            co_applicant_dob = :co_applicant_dob,
            co_applicant_gender = :co_applicant_gender,
            co_applicant_aadhaar = :co_applicant_aadhaar,
            co_applicant_pan = :co_applicant_pan,
            co_applicant_address = :co_applicant_address,
            co_applicant_district = :co_applicant_district,
            co_applicant_state = :co_applicant_state,
            co_applicant_pin = :co_applicant_pin,

            guarantor_name = :guarantor_name,
            guarantor_father_husband = :guarantor_father_husband,
            guarantor_phone = :guarantor_phone,
            guarantor_dob = :guarantor_dob,
            guarantor_gender = :guarantor_gender,
            guarantor_aadhaar = :guarantor_aadhaar,
            guarantor_pan = :guarantor_pan,
            guarantor_address = :guarantor_address,
            guarantor_district = :guarantor_district,
            guarantor_state = :guarantor_state,
            guarantor_pin = :guarantor_pin,

            loan_purpose_code = :loan_purpose_code,
            loan_purpose_title = :loan_purpose_title,
            loan_amount = :loan_amount,
            interest_rate = :interest_rate,
            tenure_months = :tenure_months,
            emi_amount = :emi_amount,
            total_payment = :total_payment,
            interest_amount = :interest_amount,
            balance_outstanding = :balance_outstanding,
            pending_count = :pending_count,

            lead_date = :lead_date,
            application_date = :application_date,
            employment_type = :employment_type,
            occupation = :occupation,
            monthly_income_range = :monthly_income_range,
            earning_members = :earning_members,
            bank_account_no = :bank_account_no,
            bank_ifsc = :bank_ifsc,
            bank_micr = :bank_micr,
            bank_name = :bank_name,
            account_holder_name = :account_holder_name,
            reference_name = :reference_name,
            reference_phone = :reference_phone,
            reference_relation = :reference_relation,

            doc_aadhaar = COALESCE(:doc_aadhaar, doc_aadhaar),
            doc_pan = COALESCE(:doc_pan, doc_pan),
            doc_photo = COALESCE(:doc_photo, doc_photo),
            doc_passbook = COALESCE(:doc_passbook, doc_passbook),
            doc_address_proof = COALESCE(:doc_address_proof, doc_address_proof),
            doc_co_aadhaar = COALESCE(:doc_co_aadhaar, doc_co_aadhaar),
            doc_guarantor_aadhaar = COALESCE(:doc_guarantor_aadhaar, doc_guarantor_aadhaar),
            additional_notes = :additional_notes
        WHERE id = :id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'id' => $id,
            'customer_name' => $data['customer_name'] ?? $loan['customer_name'],
            'father_husband_name' => $data['father_husband_name'] ?? $loan['father_husband_name'],
            'phone' => $data['phone'] ?? $loan['phone'],
            'alternate_phone' => $data['alternate_phone'] ?? $loan['alternate_phone'],
            'dob' => $data['dob'] ?? $loan['dob'],
            'gender' => $data['gender'] ?? $loan['gender'] ?? 'Male',
            'aadhaar_number' => $data['aadhaar_number'] ?? $loan['aadhaar_number'],
            'pan_number' => $data['pan_number'] ?? $loan['pan_number'],
            'address' => $data['address'] ?? $loan['address'],
            'district' => $data['district'] ?? $loan['district'],
            'state' => $data['state'] ?? $loan['state'] ?? 'Haryana',
            'pin_code' => $data['pin_code'] ?? $loan['pin_code'],

            'co_applicant_name' => $data['co_applicant_name'] ?? $loan['co_applicant_name'],
            'co_applicant_father_husband' => $data['co_applicant_father_husband'] ?? $loan['co_applicant_father_husband'],
            'co_applicant_phone' => $data['co_applicant_phone'] ?? $loan['co_applicant_phone'],
            'co_applicant_dob' => $data['co_applicant_dob'] ?? $loan['co_applicant_dob'],
            'co_applicant_gender' => $data['co_applicant_gender'] ?? $loan['co_applicant_gender'] ?? 'Male',
            'co_applicant_aadhaar' => $data['co_applicant_aadhaar'] ?? $loan['co_applicant_aadhaar'],
            'co_applicant_pan' => $data['co_applicant_pan'] ?? $loan['co_applicant_pan'],
            'co_applicant_address' => $data['co_applicant_address'] ?? $loan['co_applicant_address'],
            'co_applicant_district' => $data['co_applicant_district'] ?? $loan['co_applicant_district'],
            'co_applicant_state' => $data['co_applicant_state'] ?? $loan['co_applicant_state'] ?? 'Haryana',
            'co_applicant_pin' => $data['co_applicant_pin'] ?? $loan['co_applicant_pin'],

            'guarantor_name' => $data['guarantor_name'] ?? $loan['guarantor_name'],
            'guarantor_father_husband' => $data['guarantor_father_husband'] ?? $loan['guarantor_father_husband'],
            'guarantor_phone' => $data['guarantor_phone'] ?? $loan['guarantor_phone'],
            'guarantor_dob' => $data['guarantor_dob'] ?? $loan['guarantor_dob'],
            'guarantor_gender' => $data['guarantor_gender'] ?? $loan['guarantor_gender'] ?? 'Male',
            'guarantor_aadhaar' => $data['guarantor_aadhaar'] ?? $loan['guarantor_aadhaar'],
            'guarantor_pan' => $data['guarantor_pan'] ?? $loan['guarantor_pan'],
            'guarantor_address' => $data['guarantor_address'] ?? $loan['guarantor_address'],
            'guarantor_district' => $data['guarantor_district'] ?? $loan['guarantor_district'],
            'guarantor_state' => $data['guarantor_state'] ?? $loan['guarantor_state'] ?? 'Haryana',
            'guarantor_pin' => $data['guarantor_pin'] ?? $loan['guarantor_pin'],

            'loan_purpose_code' => $data['loan_purpose_code'] ?? $loan['loan_purpose_code'] ?? 'MICRO',
            'loan_purpose_title' => $data['loan_purpose_title'] ?? $loan['loan_purpose_title'] ?? 'Microfinance Loan',
            'loan_amount' => $principal,
            'interest_rate' => $rate,
            'tenure_months' => $months,
            'emi_amount' => $emiAmount,
            'total_payment' => $totalPayment,
            'interest_amount' => $interestAmount,
            'balance_outstanding' => $totalPayment,
            'pending_count' => $months,

            'lead_date' => $leadDate,
            'application_date' => $appDate,
            'employment_type' => $data['employment_type'] ?? $loan['employment_type'] ?? 'Salaried',
            'occupation' => $data['occupation'] ?? $loan['occupation'],
            'monthly_income_range' => $data['monthly_income_range'] ?? $loan['monthly_income_range'],
            'earning_members' => (int)($data['earning_members'] ?? $loan['earning_members'] ?? 1),
            'bank_account_no' => $data['bank_account_no'] ?? $loan['bank_account_no'],
            'bank_ifsc' => $data['bank_ifsc'] ?? $loan['bank_ifsc'],
            'bank_micr' => $data['bank_micr'] ?? $loan['bank_micr'],
            'bank_name' => $data['bank_name'] ?? $loan['bank_name'],
            'account_holder_name' => $data['account_holder_name'] ?? $loan['account_holder_name'],
            'reference_name' => $data['reference_name'] ?? $loan['reference_name'],
            'reference_phone' => $data['reference_phone'] ?? $loan['reference_phone'],
            'reference_relation' => $data['reference_relation'] ?? $loan['reference_relation'],

            'doc_aadhaar' => !empty($data['doc_aadhaar']) ? $data['doc_aadhaar'] : null,
            'doc_pan' => !empty($data['doc_pan']) ? $data['doc_pan'] : null,
            'doc_photo' => !empty($data['doc_photo']) ? $data['doc_photo'] : null,
            'doc_passbook' => !empty($data['doc_passbook']) ? $data['doc_passbook'] : null,
            'doc_address_proof' => !empty($data['doc_address_proof']) ? $data['doc_address_proof'] : null,
            'doc_co_aadhaar' => !empty($data['doc_co_aadhaar']) ? $data['doc_co_aadhaar'] : null,
            'doc_guarantor_aadhaar' => !empty($data['doc_guarantor_aadhaar']) ? $data['doc_guarantor_aadhaar'] : null,
            'additional_notes' => $data['additional_notes'] ?? $loan['additional_notes']
        ]);

        return $this->findById($id);
    }

    public function approve(int $id, string $notes = '', ?string $approvalDate = null) {
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

        $apprDate = !empty($approvalDate) ? substr($approvalDate, 0, 10) : date('Y-m-d');
        $stmt = $this->db->prepare("UPDATE loans SET status = 'Approved', approval_date = :approval_date, approval_notes = :notes WHERE id = :id");
        $stmt->execute([
            'approval_date' => $apprDate,
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

    public function getStats(bool $isAdmin = true) {
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
        
        // Base operational workflow metrics safe for all roles (Manager & Staff)
        $result = [
            'total_loans' => (int)($stats['total_loans'] ?? 0),
            'avg_tenure' => round((float)($stats['avg_tenure'] ?? 0), 1),
            'emis_cleared' => (int)($stats['emis_cleared'] ?? 0),
            'active_loans' => (int)($stats['active_loans'] ?? 0),
            'pending_approvals' => (int)($stats['pending_approvals'] ?? 0),
            'pending_disbursements' => (int)($stats['pending_disbursements'] ?? 0)
        ];

        // Financial, Income, Expense, Profit/Loss data STRICTLY for Admin
        if ($isAdmin) {
            require_once __DIR__ . '/FinancialRecord.php';
            $finModel = new FinancialRecord();
            $finSummary = $finModel->getSummary();

            $result['total_disbursed'] = (float)ceil((float)($stats['total_disbursed'] ?? 0));
            $result['total_outstanding'] = (float)ceil((float)($stats['total_outstanding'] ?? 0));
            $result['total_received'] = (float)ceil((float)($stats['total_received'] ?? 0));
            $result['expected_interest'] = (float)ceil((float)($stats['expected_interest'] ?? 0));
            $result['total_income'] = (float)ceil((float)($finSummary['total_income'] ?? 0));
            $result['total_expense'] = (float)ceil((float)($finSummary['total_expense'] ?? 0));
            $result['net_profit'] = (float)ceil((float)($finSummary['net_profit'] ?? 0));
        }

        return $result;
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
            'customer_name' => [
                'customer_name', 'name', 'borrower_name', 'client_name', 'applicant_name', 'applicant_full_name',
                'borrower_full_name', 'primary_borrower', 'customer', 'borrower', 'client', 'applicant', 'member_name'
            ],
            'father_husband_name' => [
                'father_husband_name', 'father_name', 'husband_name', 'father_husband', 'guardian_name', 'father_s_name',
                'parent_name', 'guardian', 'father', 'husband', 's_o_w_o', 'so_wo'
            ],
            'phone' => [
                'phone', 'mobile', 'mobile_number', 'phone_number', 'contact', 'primary_phone', 'primary_mobile',
                'contact_no', 'cell', 'mobile_no', 'phone_no', 'borrower_phone', 'customer_phone', 'borrower_mobile'
            ],
            'alternate_phone' => [
                'alternate_phone', 'alt_phone', 'alternate_mobile', 'alt_mobile', 'secondary_phone', 'secondary_mobile',
                'emergency_contact', 'other_phone', 'other_mobile'
            ],
            'dob' => ['dob', 'date_of_birth', 'birth_date', 'birthdate', 'borrower_dob'],
            'gender' => ['gender', 'sex'],
            'aadhaar_number' => [
                'aadhaar_number', 'aadhaar', 'aadhar', 'aadhar_number', 'uid', 'aadhaar_no', 'aadhar_no',
                'uidai', 'borrower_aadhaar', 'applicant_aadhaar'
            ],
            'pan_number' => ['pan_number', 'pan', 'pan_no', 'pan_card', 'borrower_pan', 'applicant_pan'],
            'address' => [
                'address', 'residential_address', 'full_address', 'current_address', 'street_address', 'village', 'colony'
            ],
            'district' => ['district', 'city', 'town', 'tehsil'],
            'state' => ['state', 'province'],
            'pin_code' => ['pin_code', 'pin', 'pincode', 'postal_code', 'zip', 'zip_code'],
            'loan_amount' => [
                'loan_amount', 'amount', 'principal', 'sanction_amount', 'sanctioned_amount', 'sanction_principal',
                'sanctioned_principal', 'loan_principal', 'loan_amt', 'principal_amount', 'applied_amount',
                'disbursed_amount', 'net_amount', 'sanctioned_principal_rs', 'loan_amount_rs', 'amount_rs',
                'principal_rs', 'loan_amount_in_rs', 'sanctioned_limit', 'approved_amount', 'finance_amount'
            ],
            'interest_rate' => [
                'interest_rate', 'rate', 'interest', 'roi', 'annual_interest_rate', 'rate_of_interest',
                'annual_rate', 'interest_pct', 'rate_pct'
            ],
            'tenure_months' => [
                'tenure_months', 'tenure', 'months', 'duration', 'tenure_in_months', 'period',
                'loan_tenure', 'total_emis', 'installments'
            ],
            'emi_amount' => ['emi_amount', 'emi', 'monthly_emi', 'installment', 'monthly_installment'],
            'loan_purpose_title' => [
                'loan_purpose_title', 'purpose', 'loan_purpose', 'purpose_of_loan', 'loan_category',
                'product_type', 'loan_type'
            ],
            'bank_name' => ['bank_name', 'bank', 'bank_title', 'borrower_bank'],
            'bank_account_no' => [
                'bank_account_no', 'account_no', 'account_number', 'bank_account', 'bank_acct_no',
                'ac_no', 'acct_no', 'bank_acc_no'
            ],
            'bank_ifsc' => ['bank_ifsc', 'ifsc', 'ifsc_code'],
            'bank_micr' => ['bank_micr', 'micr', 'micr_code'],
            'status' => ['status', 'loan_status', 'current_status', 'stage'],
            'lead_date' => ['lead_date', 'inquiry_date', 'origination_date', 'lead_origination_date'],
            'application_date' => ['application_date', 'applied_date', 'submission_date', 'created_date', 'created_at'],
            'approval_date' => ['approval_date', 'sanction_date', 'approved_date', 'sanctioned_date'],
            'disbursement_date' => ['disbursement_date', 'disbursed_on', 'disbursed_date', 'disbursal_date', 'payout_date', 'start_date'],
            'disbursement_mode' => ['disbursement_mode', 'payout_mode', 'payment_mode'],
            'agreement_no' => ['agreement_no', 'agreement_number', 'agreement', 'agr_no'],
            'customer_id' => ['customer_id', 'cust_id', 'cif', 'client_id', 'borrower_id'],
            'loan_no' => ['loan_no', 'application_no', 'app_no', 'loan_number', 'application_number', 'loan_no_app_no'],
            'co_applicant_name' => ['co_applicant_name', 'co_applicant', 'coapplicant_name', 'nominee_name', 'co_borrower'],
            'co_applicant_phone' => ['co_applicant_phone', 'co_applicant_mobile'],
            'co_applicant_aadhaar' => ['co_applicant_aadhaar', 'co_applicant_aadhar'],
            'guarantor_name' => ['guarantor_name', 'guarantor', 'surety_name', 'surety'],
            'guarantor_phone' => ['guarantor_phone', 'guarantor_mobile'],
            'guarantor_aadhaar' => ['guarantor_aadhaar', 'guarantor_aadhar'],
            'received_count' => ['received_count', 'emis_received', 'cleared_emis', 'paid_emis', 'emis_paid', 'installments_paid'],
            'balance_outstanding' => ['balance_outstanding', 'outstanding_balance', 'remaining_balance', 'balance', 'outstanding']
        ];

        foreach ($rows as $index => $rawRow) {
            $rowNum = $index + 2; // 1-indexed, header is line 1
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
                    if (strpos($kLower, 'amount') !== false || strpos($kLower, 'principal') !== false || strpos($kLower, 'sanction') !== false) {
                        $cand = (float)preg_replace('/[^0-9.]/', '', (string)$v);
                        if ($cand > 0) {
                            $data['loan_amount'] = $cand;
                            break;
                        }
                    }
                }
            }

            // Fallback 2: Locate customer_name if not matched directly
            if (empty($data['customer_name'])) {
                foreach ($rawRow as $k => $v) {
                    $kLower = strtolower($k);
                    if ((strpos($kLower, 'name') !== false || strpos($kLower, 'borrower') !== false || strpos($kLower, 'customer') !== false) &&
                        strpos($kLower, 'father') === false && strpos($kLower, 'husband') === false && strpos($kLower, 'bank') === false &&
                        strpos($kLower, 'co_') === false && strpos($kLower, 'guarantor') === false) {
                        if (!empty(trim((string)$v))) {
                            $data['customer_name'] = trim((string)$v);
                            break;
                        }
                    }
                }
            }

            // Fallback 3: Locate mobile phone if not matched directly
            if (empty($data['phone'])) {
                foreach ($rawRow as $k => $v) {
                    $kLower = strtolower($k);
                    if ((strpos($kLower, 'mobile') !== false || strpos($kLower, 'phone') !== false || strpos($kLower, 'contact') !== false) &&
                        strpos($kLower, 'alt') === false && strpos($kLower, 'co_') === false && strpos($kLower, 'guarantor') === false) {
                        $digits = preg_replace('/\D/', '', (string)$v);
                        if (strlen($digits) >= 10) {
                            $data['phone'] = substr($digits, -10);
                            break;
                        }
                    }
                }
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
                $rate = !empty($data['interest_rate']) ? (float)preg_replace('/[^0-9.]/', '', (string)$data['interest_rate']) : 14.5;
                if ($rate <= 0) $rate = 14.5;
                $months = !empty($data['tenure_months']) ? (int)preg_replace('/\D/', '', (string)$data['tenure_months']) : 24;
                if ($months <= 0) $months = 24;

                // Compute Financial Math with CEIL
                $monthlyRate = ($rate / 12) / 100;
                $computedEmi = ($principal * $monthlyRate * pow(1 + $monthlyRate, $months)) / (pow(1 + $monthlyRate, $months) - 1);
                $emiAmount = !empty($data['emi_amount']) ? (float)ceil((float)preg_replace('/[^0-9.]/', '', (string)$data['emi_amount'])) : (float)ceil($computedEmi);
                $totalPayment = (float)ceil($emiAmount * $months);
                $interestAmount = (float)ceil($totalPayment - $principal);

                // Received count and outstanding balance
                $recCount = isset($data['received_count']) && $data['received_count'] !== '' ? (int)preg_replace('/\D/', '', (string)$data['received_count']) : 0;
                if (isset($data['balance_outstanding']) && $data['balance_outstanding'] !== '') {
                    $balance = (float)ceil((float)preg_replace('/[^0-9.]/', '', (string)$data['balance_outstanding']));
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

                // Milestone dates resolution
                $appDate = !empty($data['application_date']) ? $data['application_date'] : date('Y-m-d');
                $leadDate = !empty($data['lead_date']) ? $data['lead_date'] : $appDate;
                $approvalDate = !empty($data['approval_date']) ? $data['approval_date'] : ($status === 'Approved' || $status === 'Active' || $status === 'Closed' ? $appDate : null);
                $disbDate = !empty($data['disbursement_date']) ? $data['disbursement_date'] : ($status === 'Active' || $status === 'Closed' ? date('Y-m-d') : null);

                $sql = "INSERT INTO loans (
                    loan_no, customer_id, agreement_no, customer_name, father_husband_name, phone, alternate_phone, dob, gender, aadhaar_number, pan_number, address, district, state, pin_code,
                    co_applicant_name, co_applicant_phone, co_applicant_aadhaar,
                    guarantor_name, guarantor_phone, guarantor_aadhaar,
                    loan_purpose_code, loan_purpose_title, loan_amount, interest_rate, tenure_months, emi_amount, total_payment, interest_amount, balance_outstanding,
                    received_count, pending_count, status, lead_date, application_date, approval_date, disbursement_date, disbursement_mode,
                    bank_account_no, bank_ifsc, bank_micr, bank_name, account_holder_name,
                    terms_accepted, additional_notes
                ) VALUES (
                    :loan_no, :customer_id, :agreement_no, :customer_name, :father_husband_name, :phone, :alternate_phone, :dob, :gender, :aadhaar_number, :pan_number, :address, :district, :state, :pin_code,
                    :co_applicant_name, :co_applicant_phone, :co_applicant_aadhaar,
                    :guarantor_name, :guarantor_phone, :guarantor_aadhaar,
                    :loan_purpose_code, :loan_purpose_title, :loan_amount, :interest_rate, :tenure_months, :emi_amount, :total_payment, :interest_amount, :balance_outstanding,
                    :received_count, :pending_count, :status, :lead_date, :application_date, :approval_date, :disbursement_date, :disbursement_mode,
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
                    'lead_date' => $leadDate,
                    'application_date' => $appDate,
                    'approval_date' => $approvalDate,
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
