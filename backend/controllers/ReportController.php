<?php
require_once __DIR__ . '/../models/FinancialRecord.php';
require_once __DIR__ . '/../models/Loan.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/AuthHelper.php';

class ReportController {
    private $financialRecordModel;
    private $loanModel;

    public function __construct() {
        $this->financialRecordModel = new FinancialRecord();
        $this->loanModel = new Loan();
    }

    public function profitLoss() {
        AuthHelper::requireRole(['admin']);
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo = $_GET['date_to'] ?? null;

        $summary = $this->financialRecordModel->getSummary($dateFrom, $dateTo);
        $records = $this->financialRecordModel->getAll($dateFrom, $dateTo);

        Response::json(true, 'Profit and Loss data retrieved', [
            'summary' => $summary,
            'records' => $records
        ]);
    }

    public function totalProfitLoss() {
        AuthHelper::requireRole(['admin']);
        $db = Database::getInstance()->getConnection();

        $countStmt = $db->query("SELECT COUNT(*) as loan_count FROM loans");
        $loanCount = (int)($countStmt->fetch()['loan_count'] ?? 0);

        $disbursedStmt = $db->query("SELECT COALESCE(SUM(CASE WHEN status IN ('Active', 'Closed') THEN loan_amount ELSE 0 END), 0) as total_disbursed FROM loans");
        $totalDisbursed = (float)($disbursedStmt->fetch()['total_disbursed'] ?? 0);

        $receivedStmt = $db->query("SELECT COALESCE(SUM(total_paid), 0) as total_received FROM emi_payments WHERE status = 'Received'");
        $totalReceived = (float)($receivedStmt->fetch()['total_received'] ?? 0);

        $interestStmt = $db->query("SELECT COALESCE(SUM(interest_amount), 0) as total_interest FROM loans");
        $totalInterest = (float)($interestStmt->fetch()['total_interest'] ?? 0);

        // TODO: In the future, fetch these from actual fee structures or tables
        $docFee = 0.00;
        $serviceCharge = 0.00;
        $penaltyScheduled = 0.00;
        $penaltyReceived = 0.00;
        $cbcReceived = 0.00;
        $totalFees = $docFee + $serviceCharge + $penaltyScheduled + $cbcReceived;

        $totalReceivable = $totalDisbursed + $totalInterest + $totalFees;
        $totalPending = $totalReceivable - $totalReceived;

        Response::json(true, 'Total Executive P&L retrieved', [
            'loan_count' => $loanCount,
            'metrics' => [
                'total_receivable' => (float)ceil($totalReceivable),
                'total_disbursed' => (float)ceil($totalDisbursed),
                'interest_and_charges' => (float)ceil($totalInterest + $totalFees),
                'total_received' => (float)ceil($totalReceived),
                'total_pending' => (float)ceil($totalPending),
                'total_interest' => (float)ceil($totalInterest),
                'doc_fee' => (float)ceil($docFee),
                'service_charge' => (float)ceil($serviceCharge),
                'penalty_scheduled' => (float)ceil($penaltyScheduled),
                'penalty_received' => (float)ceil($penaltyReceived),
                'cbc_received' => (float)ceil($cbcReceived),
                'total_fees' => (float)ceil($totalFees)
            ]
        ]);
    }

    public function storeEntry() {
        AuthHelper::requireRole(['admin']);
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        if (empty($input['type']) || empty($input['category']) || empty($input['amount'])) {
            Response::error('Type, Category, and Amount are required', 400);
        }

        $id = $this->financialRecordModel->create($input);
        Response::json(true, 'Financial entry recorded', ['id' => $id], 201);
    }

    public function emiStatus() {
        $db = Database::getInstance()->getConnection();
        
        $statsStmt = $db->query("
            SELECT 
                COALESCE(SUM(received_count), 0) as total_emi_received,
                COALESCE(SUM(tenure_months), 0) as total_emi_count,
                COALESCE(SUM(pending_count), 0) as total_emi_pending,
                COALESCE(SUM(balance_outstanding), 0) as due_emi_amount
            FROM loans
        ");
        $stats = $statsStmt->fetch();

        $paidStmt = $db->query("SELECT COALESCE(SUM(total_paid), 0) as total_amount_received FROM emi_payments WHERE status = 'Received'");
        $paid = $paidStmt->fetch();

        $loansStmt = $db->query("SELECT * FROM loans ORDER BY id DESC");
        $loans = $loansStmt->fetchAll();

        $loanList = array_map(function($l) use ($db) {
            $receivedAmtStmt = $db->prepare("SELECT COALESCE(SUM(total_paid), 0) as actual_received FROM emi_payments WHERE loan_id = :id AND status = 'Received'");
            $receivedAmtStmt->execute(['id' => $l['id']]);
            $actualReceived = (float)($receivedAmtStmt->fetch()['actual_received'] ?? 0);

            $merged = $l;
            $merged['id'] = (int)$l['id'];
            $merged['loan_amount'] = (float)ceil((float)$l['loan_amount']);
            $merged['interest_amount'] = (float)ceil((float)$l['interest_amount']);
            $merged['total_payment'] = (float)ceil((float)$l['total_payment']);
            $merged['emi_amount'] = (float)ceil((float)$l['emi_amount']);
            $merged['due_emi_amount'] = (float)ceil((float)$l['balance_outstanding']);
            $merged['emi_received'] = (int)$l['received_count'];
            $merged['emi_pending'] = (int)$l['pending_count'];
            $merged['actual_received'] = (float)ceil($actualReceived);
            $merged['actual_outstanding'] = (float)ceil((float)$l['balance_outstanding']);
            return $merged;
        }, $loans);

        Response::json(true, 'EMI Report status data retrieved', [
            'kpis' => [
                'emi_received' => (int)$stats['total_emi_received'],
                'total_emi_count' => (int)$stats['total_emi_count'],
                'total_amount_received' => (float)ceil((float)$paid['total_amount_received']),
                'total_emi_pending' => (int)$stats['total_emi_pending'],
                'due_emi_amount' => (float)ceil((float)$stats['due_emi_amount'])
            ],
            'loans' => $loanList
        ]);
    }
}
