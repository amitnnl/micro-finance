<?php
require_once __DIR__ . '/../models/Loan.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/AuthHelper.php';

class LoanController {
    private $loanModel;

    public function __construct() {
        $this->loanModel = new Loan();
    }

    public function index() {
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        $loans = $this->loanModel->getAll($status, $search);
        Response::json(true, 'Loans retrieved successfully', ['loans' => $loans]);
    }

    public function show() {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            Response::error('Invalid Loan ID', 400);
        }

        $loan = $this->loanModel->findById($id);
        if (!$loan) {
            Response::error('Loan record not found', 404);
        }

        Response::json(true, 'Loan details retrieved', ['loan' => $loan]);
    }

    public function store() {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $requiredFields = [
            'customer_name' => 'Applicant Full Name',
            'father_husband_name' => 'Father / Husband Name',
            'phone' => 'Mobile Number',
            'dob' => 'Date of Birth',
            'gender' => 'Gender',
            'aadhaar_number' => 'Aadhaar Number',
            'pan_number' => 'PAN Number',
            'address' => 'Current Address',
            'district' => 'District',
            'state' => 'State',
            'pin_code' => 'PIN Code',
            'loan_purpose_title' => 'Loan Purpose',
            'loan_amount' => 'Loan Amount',
            'tenure_months' => 'Tenure Months',
            'bank_name' => 'Bank Name',
            'bank_account_no' => 'Bank Account Number',
            'bank_ifsc' => 'Bank IFSC Code'
        ];

        foreach ($requiredFields as $field => $label) {
            if (empty($input[$field])) {
                Response::error("Mandatory field missing: {$label}", 400);
            }
        }

        $principal = (float)ceil((float)$input['loan_amount']);
        if ($principal < 1000 || $principal > 200000) {
            Response::error('Microfinance loan amount must be between ₹1,000 and ₹2,00,000 (2 Lakhs maximum)', 400);
        }
        $input['loan_amount'] = $principal;

        $result = $this->loanModel->create($input);
        Response::json(true, 'Loan Application created successfully', $result, 201);
    }

    public function dashboardStats() {
        $stats = $this->loanModel->getStats();
        Response::json(true, 'Dashboard statistics loaded', ['stats' => $stats]);
    }

    public function disburse() {
        AuthHelper::requireRole(['admin']);
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        
        $id = (int)($input['id'] ?? 0);
        $date = $input['date'] ?? date('Y-m-d');
        $mode = $input['mode'] ?? 'Bank Transfer';
        $reference = $input['reference_no'] ?? $input['reference'] ?? '';
        $notes = $input['notes'] ?? '';

        if ($id <= 0) {
            Response::error('Invalid Loan ID', 400);
        }

        try {
            $this->loanModel->disburse($id, $date, $mode, $notes, $reference);
            Response::json(true, 'Loan disbursed successfully');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function approve() {
        AuthHelper::requireRole(['admin', 'manager']);
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $id = (int)($input['id'] ?? 0);
        $notes = trim($input['notes'] ?? '');

        if ($id <= 0) {
            Response::error('Invalid Loan ID', 400);
        }

        try {
            $this->loanModel->approve($id, $notes);
            Response::json(true, 'Loan Application approved successfully. Ready for fund disbursement.');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function reject() {
        AuthHelper::requireRole(['admin', 'manager']);
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $id = (int)($input['id'] ?? 0);
        $reason = trim($input['reason'] ?? '');

        if ($id <= 0) {
            Response::error('Invalid Loan ID', 400);
        }

        try {
            $this->loanModel->reject($id, $reason);
            Response::json(true, 'Loan Application rejected');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function checkDocuments() {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_REQUEST;

        $docs = [
            'aadhaar' => $input['aadhaar'] ?? $input['aadhaar_number'] ?? '',
            'pan' => $input['pan'] ?? $input['pan_number'] ?? '',
            'phone' => $input['phone'] ?? ''
        ];
        $role = $input['role'] ?? 'applicant';

        $result = $this->loanModel->checkDocuments($docs, $role);
        Response::json(true, 'Document check completed', $result);
    }

    public function importCsv() {
        AuthHelper::requireRole(['admin']);
        $rows = [];

        // Check if raw rows passed as JSON body
        $rawInput = file_get_contents('php://input');
        $json = json_decode($rawInput, true);
        if ($json && !empty($json['rows']) && is_array($json['rows'])) {
            $rows = $json['rows'];
        } elseif (!empty($_FILES['file']['tmp_name'])) {
            // Process uploaded CSV file
            $filePath = $_FILES['file']['tmp_name'];
            if (!file_exists($filePath) || !is_readable($filePath)) {
                Response::error('Uploaded CSV file cannot be read', 400);
            }

            $handle = fopen($filePath, 'r');
            if ($handle === false) {
                Response::error('Failed to open CSV file', 400);
            }

            // Detect UTF-8 BOM and strip if present
            $bom = fread($handle, 3);
            if ($bom !== "\xEF\xBB\xBF") {
                rewind($handle);
            }

            // Read header row
            $header = fgetcsv($handle);
            if (!$header || empty($header)) {
                fclose($handle);
                Response::error('CSV file is empty or missing headers', 400);
            }

            // Clean header values
            $cleanHeader = array_map(function($h) {
                return trim((string)$h);
            }, $header);

            while (($row = fgetcsv($handle)) !== false) {
                // Ignore completely empty lines
                if (count(array_filter($row)) === 0) continue;

                $rowAssoc = [];
                foreach ($cleanHeader as $idx => $key) {
                    $rowAssoc[$key] = $row[$idx] ?? '';
                }
                $rows[] = $rowAssoc;
            }
            fclose($handle);
        } else {
            Response::error('No CSV file or rows provided for import', 400);
        }

        if (empty($rows)) {
            Response::error('No data rows found in CSV', 400);
        }

        $result = $this->loanModel->batchImport($rows);
        Response::json(true, "CSV Processed: {$result['imported']} records imported, {$result['skipped']} skipped", $result);
    }

    public function exportCsv() {
        AuthHelper::requireRole(['admin']);
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        $loans = $this->loanModel->getAll($status, $search);

        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="loan_records_export_' . date('Y-m-d_His') . '.csv"');
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');

        // Write UTF-8 BOM for Microsoft Excel Windows compatibility
        fputs($out, "\xEF\xBB\xBF");

        // Headers
        fputcsv($out, [
            'Loan No / App No',
            'Agreement No',
            'Customer ID',
            'Borrower Full Name',
            'Father / Husband Name',
            'Primary Mobile',
            'Alternate Mobile',
            'Date of Birth',
            'Gender',
            'Aadhaar Number',
            'PAN Number',
            'Address',
            'District',
            'State',
            'PIN Code',
            'Loan Purpose',
            'Sanctioned Principal',
            'Annual Interest Rate (%)',
            'Tenure (Months)',
            'Monthly EMI',
            'Total Repayment',
            'Interest Component',
            'Balance Outstanding',
            'EMIs Received',
            'EMIs Pending',
            'Status',
            'Disbursement Date',
            'Disbursement Mode',
            'Bank Name',
            'Account Number',
            'IFSC Code',
            'Co-Applicant Name',
            'Co-Applicant Phone',
            'Guarantor Name',
            'Guarantor Phone',
            'Created Date'
        ]);

        foreach ($loans as $l) {
            fputcsv($out, [
                $l['loan_no'] ?? '',
                $l['agreement_no'] ?? '',
                $l['customer_id'] ?? '',
                $l['customer_name'] ?? '',
                $l['father_husband_name'] ?? '',
                $l['phone'] ?? '',
                $l['alternate_phone'] ?? '',
                $l['dob'] ?? '',
                $l['gender'] ?? '',
                $l['aadhaar_number'] ?? '',
                $l['pan_number'] ?? '',
                $l['address'] ?? '',
                $l['district'] ?? '',
                $l['state'] ?? '',
                $l['pin_code'] ?? '',
                $l['loan_purpose_title'] ?? '',
                $l['loan_amount'] ?? '',
                $l['interest_rate'] ?? '',
                $l['tenure_months'] ?? '',
                $l['emi_amount'] ?? '',
                $l['total_payment'] ?? '',
                $l['interest_amount'] ?? '',
                $l['balance_outstanding'] ?? '',
                $l['received_count'] ?? 0,
                $l['pending_count'] ?? 0,
                $l['status'] ?? 'Active',
                $l['disbursement_date'] ?? '',
                $l['disbursement_mode'] ?? '',
                $l['bank_name'] ?? '',
                $l['bank_account_no'] ?? '',
                $l['bank_ifsc'] ?? '',
                $l['co_applicant_name'] ?? '',
                $l['co_applicant_phone'] ?? '',
                $l['guarantor_name'] ?? '',
                $l['guarantor_phone'] ?? '',
                $l['created_at'] ?? ''
            ]);
        }

        fclose($out);
        exit();
    }

    public function sampleCsv() {
        AuthHelper::requireRole(['admin']);
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="loan_import_sample_template.csv"');
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');
        fputs($out, "\xEF\xBB\xBF");

        fputcsv($out, [
            'customer_name',
            'father_husband_name',
            'phone',
            'alternate_phone',
            'dob',
            'gender',
            'aadhaar_number',
            'pan_number',
            'address',
            'district',
            'state',
            'pin_code',
            'loan_amount',
            'interest_rate',
            'tenure_months',
            'loan_purpose_title',
            'status',
            'disbursement_date',
            'bank_name',
            'bank_account_no',
            'bank_ifsc',
            'co_applicant_name',
            'co_applicant_phone',
            'guarantor_name',
            'guarantor_phone'
        ]);

        // Sample Row 1
        fputcsv($out, [
            'RAMESH KUMAR',
            'SURESH CHAND',
            '9876543210',
            '9812345678',
            '1988-06-15',
            'Male',
            '5412 8956 2314',
            'ABCDE1234F',
            'VPO Narnaul, Ward 4',
            'Mahendergarh',
            'Haryana',
            '123001',
            '50000',
            '35',
            '12',
            'Animal Husbandry Loan',
            'Active',
            '2026-05-10',
            'State Bank of India',
            '30987654321',
            'SBIN0001234',
            'SUNITA DEVI',
            '9876500000',
            'VIJAY SINGH',
            '9811122233'
        ]);

        // Sample Row 2
        fputcsv($out, [
            'KAVITA SHARMA',
            'RAJESH SHARMA',
            '9812001122',
            '',
            '1992-11-20',
            'Female',
            '6523 4125 9874',
            'PQRS5678K',
            'Main Bazaar, Near Clock Tower',
            'Rewari',
            'Haryana',
            '123401',
            '75000',
            '35',
            '18',
            'Kirana Retail Shop',
            'Approved',
            '',
            'Punjab National Bank',
            '0890001234567890',
            'PUNB0089000',
            '',
            '',
            '',
            ''
        ]);

        fclose($out);
        exit();
    }
}
