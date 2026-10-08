<?php
require_once __DIR__ . '/../models/Appointment.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/AuthHelper.php';

class AppointmentController {
    private $appointmentModel;

    public function __construct() {
        $this->appointmentModel = new Appointment();
    }

    public function index() {
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        $appointments = $this->appointmentModel->getAll($status, $search);
        Response::json(true, 'Leads list retrieved', ['appointments' => $appointments]);
    }

    public function store() {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        if (empty($input['client_name']) || empty($input['phone'])) {
            Response::error('Client Name and Phone are required', 400);
        }

        $amount = (float)($input['loan_amount'] ?? 0);
        if ($amount > 200000) {
            Response::error('Microfinance lead loan amount cannot exceed ₹2,00,000 (2 Lakhs maximum)', 400);
        }

        $result = $this->appointmentModel->create($input);
        Response::json(true, 'Lead created successfully', $result, 201);
    }

    public function updateStatus() {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $id = (int)($input['id'] ?? 0);
        $status = $input['status'] ?? '';
        $reason = $input['reject_reason'] ?? null;

        if ($id <= 0 || !in_array($status, ['Approved', 'Confirmed', 'Rejected', 'Pending', 'Draft', 'Completed'])) {
            Response::error('Invalid ID or status value', 400);
        }

        $this->appointmentModel->updateStatus($id, $status, $reason);
        Response::json(true, "Lead status updated to {$status}");
    }

    public function exportCsv() {
        AuthHelper::requireRole(['admin']);
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        $appointments = $this->appointmentModel->getAll($status, $search);

        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="create_leads_export_' . date('Y-m-d_His') . '.csv"');
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');
        fputs($out, "\xEF\xBB\xBF");

        fputcsv($out, [
            'Lead / Apt No',
            'Client Name',
            'Mobile Phone',
            'Aadhaar Number',
            'Loan Amount (Rs)',
            'Lead Date',
            'Source Type',
            'Referral Name',
            'Email Address',
            'Address',
            'City / Town',
            'Appointment Date',
            'Status',
            'Created At'
        ]);

        foreach ($appointments as $apt) {
            fputcsv($out, [
                $apt['appointment_no'] ?? '',
                $apt['client_name'] ?? '',
                $apt['phone'] ?? '',
                $apt['aadhaar_number'] ?? '',
                (float)($apt['loan_amount'] ?? 0),
                $apt['lead_date'] ?? '',
                $apt['source_type'] ?? 'Direct',
                $apt['referral_name'] ?? '',
                $apt['email'] ?? '',
                $apt['address'] ?? '',
                $apt['city'] ?? '',
                $apt['appointment_date'] ?? '',
                $apt['status'] ?? 'Pending',
                $apt['created_at'] ?? ''
            ]);
        }

        fclose($out);
        exit;
    }

    public function importCsv() {
        AuthHelper::requireRole(['admin']);
        $rows = [];

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

        $result = $this->appointmentModel->batchImport($rows);
        Response::json(true, "CSV Processed: {$result['imported']} leads imported, {$result['skipped']} skipped", $result);
    }

    public function sampleCsv() {
        AuthHelper::requireRole(['admin']);
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="create_lead_import_sample_template.csv"');
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');
        fputs($out, "\xEF\xBB\xBF");

        fputcsv($out, [
            'client_name',
            'phone',
            'aadhaar_number',
            'loan_amount',
            'lead_date',
            'source_type',
            'email',
            'address',
            'city',
            'status'
        ]);

        // Sample Row 1
        fputcsv($out, [
            'MOHAN LAL',
            '9876543210',
            '852147963258',
            '50000',
            date('Y-m-d'),
            'Lead',
            'mohan.lal@example.com',
            'NEAR BUS STAND, MAIN MARKET',
            'NARNAUL',
            'Pending'
        ]);

        // Sample Row 2
        fputcsv($out, [
            'SUNITA DEVI',
            '9812345678',
            '741258963214',
            '100000',
            date('Y-m-d'),
            'Direct',
            'sunita.devi@example.com',
            'VILLAGE ATELI, MANDI ROAD',
            'MAHENDERGARH',
            'Pending'
        ]);

        fclose($out);
        exit;
    }
}
