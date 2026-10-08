<?php
require_once __DIR__ . '/../config/Database.php';

class EmiPayment {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getActiveLoans() {
        $stmt = $this->db->prepare("SELECT id, loan_no, agreement_no, customer_id, customer_name, phone, loan_amount, emi_amount, balance_outstanding, received_count, pending_count, lead_date, application_date, approval_date, disbursement_date, created_at, COALESCE(next_due_date, DATE(DATE_ADD(COALESCE(disbursement_date, created_at), INTERVAL 1 MONTH))) AS next_due_date, status FROM loans WHERE status = 'Active' ORDER BY id DESC");
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getStatement(?string $status = null, ?string $dateFrom = null, ?string $dateTo = null, ?int $loanId = null) {
        $query = "
            SELECT e.*, l.loan_no, l.agreement_no, l.customer_id, l.customer_name, l.phone, l.co_applicant_name, l.guarantor_name, l.lead_date, l.application_date, l.approval_date, l.disbursement_date, l.created_at 
            FROM emi_payments e
            JOIN loans l ON e.loan_id = l.id
            WHERE 1=1
        ";
        $params = [];

        if ($loanId && $loanId > 0) {
            $query .= " AND e.loan_id = :loan_id";
            $params['loan_id'] = $loanId;
        }

        if ($status) {
            $query .= " AND e.status = :status";
            $params['status'] = $status;
        }

        if ($dateFrom) {
            $query .= " AND e.payment_date >= :date_from";
            $params['date_from'] = $dateFrom;
        }

        if ($dateTo) {
            $query .= " AND e.payment_date <= :date_to";
            $params['date_to'] = $dateTo;
        }

        if ($loanId && $loanId > 0) {
            $query .= " ORDER BY e.payment_date ASC, e.id ASC";
        } else {
            $query .= " ORDER BY e.id DESC";
        }

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function processPayment(array $data) {
        $loanId = (int)$data['loan_id'];
        $emiAmount = (float)ceil((float)$data['emi_amount']);
        $penaltyAmount = (float)ceil((float)($data['penalty_amount'] ?? 0));
        $totalPaid = (float)ceil($emiAmount + $penaltyAmount);
        $paymentMode = $data['payment_mode'] ?? 'Cash';
        $paymentDate = $data['payment_date'] ?? date('Y-m-d');
        $notes = $data['notes'] ?? '';
        $receiptNo = 'REC-' . time() . '-' . rand(10, 99);

        // Verify loan exists
        $stmt = $this->db->prepare("SELECT * FROM loans WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $loanId]);
        $loan = $stmt->fetch();

        if (!$loan) {
            throw new Exception("Loan account with ID {$loanId} not found");
        }

        try {
            // Begin Transaction if supported
            if (method_exists($this->db, 'beginTransaction')) {
                $this->db->beginTransaction();
            }

            // 1. Insert EMI Payment Record
            $sqlEmi = "INSERT INTO emi_payments (loan_id, receipt_no, emi_amount, penalty_amount, total_paid, payment_date, payment_mode, notes, status)
                       VALUES (:loan_id, :receipt_no, :emi_amount, :penalty_amount, :total_paid, :payment_date, :payment_mode, :notes, 'Received')";
            $stmtEmi = $this->db->prepare($sqlEmi);
            $stmtEmi->execute([
                'loan_id' => $loanId,
                'receipt_no' => $receiptNo,
                'emi_amount' => $emiAmount,
                'penalty_amount' => $penaltyAmount,
                'total_paid' => $totalPaid,
                'payment_date' => $paymentDate,
                'payment_mode' => $paymentMode,
                'notes' => $notes
            ]);

            // 2. Update Loan Balance & Counts
            $newBalance = max(0, (float)ceil((float)$loan['balance_outstanding'] - $emiAmount));
            $newReceived = (int)$loan['received_count'] + 1;
            $newPending = max(0, (int)$loan['pending_count'] - 1);
            $newStatus = $newBalance == 0 ? 'Closed' : 'Active';

            $sqlLoan = "UPDATE loans SET balance_outstanding = :balance, received_count = :received, pending_count = :pending, status = :status, next_due_date = :next_due_date WHERE id = :id";
            $nextDueDate = date('Y-m-d', strtotime($paymentDate . ' +1 month'));
            $stmtLoan = $this->db->prepare($sqlLoan);
            $stmtLoan->execute([
                'balance' => $newBalance,
                'received' => $newReceived,
                'pending' => $newPending,
                'status' => $newStatus,
                'next_due_date' => $nextDueDate,
                'id' => $loanId
            ]);

            // 3. Record Income Transaction
            $sqlFin = "INSERT INTO financial_records (date, type, category, amount, description) VALUES (:date, 'INCOME', 'EMI Collection', :amount, :desc)";
            $stmtFin = $this->db->prepare($sqlFin);
            $stmtFin->execute([
                'date' => $paymentDate,
                'amount' => $totalPaid,
                'desc' => "EMI Collection for Loan {$loan['loan_no']} (Receipt: {$receiptNo})"
            ]);

            if (method_exists($this->db, 'commit')) {
                $this->db->commit();
            }

            return [
                'receipt_no' => $receiptNo,
                'customer_name' => $loan['customer_name'],
                'loan_no' => $loan['loan_no'],
                'agreement_no' => $loan['agreement_no'] ?? $loan['loan_no'],
                'customer_id' => $loan['customer_id'] ?? null,
                'phone' => $loan['phone'] ?? null,
                'lead_date' => $loan['lead_date'] ?? null,
                'application_date' => $loan['application_date'] ?? substr($loan['created_at'], 0, 10),
                'approval_date' => $loan['approval_date'] ?? null,
                'disbursement_date' => $loan['disbursement_date'] ?? null,
                'total_paid' => $totalPaid,
                'remaining_balance' => $newBalance,
                'payment_date' => $paymentDate
            ];
        } catch (Exception $e) {
            if (method_exists($this->db, 'rollBack')) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }
}
