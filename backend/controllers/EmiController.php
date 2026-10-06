<?php
require_once __DIR__ . '/../models/EmiPayment.php';
require_once __DIR__ . '/../helpers/Response.php';

class EmiController {
    private $emiModel;

    public function __construct() {
        $this->emiModel = new EmiPayment();
    }

    public function activeLoans() {
        $loans = $this->emiModel->getActiveLoans();
        Response::json(true, 'Active loans retrieved', ['loans' => $loans]);
    }

    public function statement() {
        $status = $_GET['status'] ?? null;
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo = $_GET['date_to'] ?? null;
        $loanId = isset($_GET['loan_id']) && (int)$_GET['loan_id'] > 0 ? (int)$_GET['loan_id'] : null;
        $reports = $this->emiModel->getStatement($status, $dateFrom, $dateTo, $loanId);

        $loan = null;
        if ($loanId) {
            require_once __DIR__ . '/../models/Loan.php';
            $loanModel = new Loan();
            $loan = $loanModel->findById($loanId);
        }

        Response::json(true, 'EMI statement history retrieved', [
            'statement' => $reports,
            'loan' => $loan
        ]);
    }

    public function processPayment() {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        if (empty($input['loan_id']) || empty($input['emi_amount'])) {
            Response::error('Loan ID and EMI Amount are required fields', 400);
        }

        try {
            $result = $this->emiModel->processPayment($input);
            Response::json(true, 'EMI Payment recorded successfully', $result, 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }
}
