<?php
require_once __DIR__ . '/../models/Lead.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/AuthHelper.php';

class LeadController {
    private $leadModel;

    public function __construct() {
        $this->leadModel = new Lead();
    }

    public function index() {
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        $leads = $this->leadModel->getAll($status, $search);
        Response::json(true, 'Leads retrieved successfully', ['leads' => $leads]);
    }

    public function store() {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        if (empty($input['name']) || empty($input['phone'])) {
            Response::error('Name and Phone are required', 400);
        }

        $amount = (float)($input['amount'] ?? 0);
        if ($amount > 200000) {
            Response::error('Microfinance lead amount cannot exceed ₹2,00,000 (2 Lakhs maximum)', 400);
        }

        $result = $this->leadModel->create($input);
        Response::json(true, 'Lead created successfully', $result, 201);
    }

    public function updateStatus() {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $id = (int)($input['id'] ?? 0);
        $status = $input['status'] ?? '';

        if ($id <= 0 || !in_array($status, ['Approved', 'Rejected', 'Pending'])) {
            Response::error('Invalid ID or status value', 400);
        }

        $this->leadModel->updateStatus($id, $status);
        Response::json(true, "Lead status updated to {$status}");
    }

    public function exportCsv() {
        AuthHelper::requireRole(['admin']);
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        $leads = $this->leadModel->getAll($status, $search);

        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="external_leads_export_' . date('Y-m-d_His') . '.csv"');
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');
        // Write UTF-8 BOM for Microsoft Excel Windows compatibility
        fputs($out, "\xEF\xBB\xBF");

        fputcsv($out, [
            'Lead No',
            'Applicant Name',
            'Mobile Phone',
            'Email Address',
            'City / Location',
            'Requested Amount',
            'Loan Category',
            'Status',
            'Created At'
        ]);

        foreach ($leads as $l) {
            fputcsv($out, [
                $l['lead_no'] ?? '',
                $l['name'] ?? '',
                $l['phone'] ?? '',
                $l['email'] ?? '',
                $l['city'] ?? '',
                (float)($l['amount'] ?? 0),
                $l['loan_type'] ?? 'Microfinance Loan',
                $l['status'] ?? 'Pending',
                $l['created_at'] ?? ''
            ]);
        }

        fclose($out);
        exit;
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
            $filePath = $_FILES['file']['tmp_name'];
            if (!file_exists($filePath) || !is_readable($filePath)) {
                Response::error('Uploaded CSV file cannot be read', 400);
            }

            $handle = fopen($filePath, 'r');
            if ($handle === false) {
                Response::error('Failed to open CSV file', 400);
            }

            $bom = fread($handle, 3);
            if ($bom !== "\xEF\xBB\xBF") {
                rewind($handle);
            }

            $header = fgetcsv($handle);
            if (!$header || empty($header)) {
                fclose($handle);
                Response::error('CSV file is empty or missing headers', 400);
            }

            $cleanHeader = array_map(function($h) {
                return trim((string)$h);
            }, $header);

            while (($row = fgetcsv($handle)) !== false) {
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

        $result = $this->leadModel->batchImport($rows);
        Response::json(true, "CSV Processed: {$result['imported']} external leads imported, {$result['skipped']} skipped", $result);
    }

    public function sampleCsv() {
        AuthHelper::requireRole(['admin']);
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="external_lead_import_sample_template.csv"');
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');
        fputs($out, "\xEF\xBB\xBF");

        fputcsv($out, [
            'name',
            'phone',
            'email',
            'city',
            'amount',
            'loan_type',
            'status'
        ]);

        // Sample Row 1
        fputcsv($out, [
            'SITA DEVI',
            '9876543210',
            'sita.devi@example.com',
            'NARNAUL',
            '50000',
            'Women Empowerment',
            'Pending'
        ]);

        // Sample Row 2
        fputcsv($out, [
            'RAJESH KUMAR',
            '9812345678',
            'rajesh.kumar@example.com',
            'MAHENDERGARH',
            '100000',
            'Small Business',
            'Pending'
        ]);

        fclose($out);
        exit;
    }
}
