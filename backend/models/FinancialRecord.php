<?php
require_once __DIR__ . '/../config/Database.php';

class FinancialRecord {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getReport(?string $dateFrom = null, ?string $dateTo = null, ?string $category = null) {
        $query = "SELECT * FROM financial_records WHERE 1=1";
        $params = [];

        if ($dateFrom) {
            $query .= " AND date >= :date_from";
            $params['date_from'] = $dateFrom;
        }
        if ($dateTo) {
            $query .= " AND date <= :date_to";
            $params['date_to'] = $dateTo;
        }
        if ($category) {
            $query .= " AND category LIKE :category";
            $params['category'] = "%{$category}%";
        }

        $query .= " ORDER BY date DESC, id DESC";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $records = $stmt->fetchAll();

        $totalIncome = 0;
        $totalExpense = 0;

        foreach ($records as $r) {
            if ($r['type'] === 'INCOME') $totalIncome += (float)$r['amount'];
            if ($r['type'] === 'EXPENSE') $totalExpense += (float)$r['amount'];
        }

        return [
            'summary' => [
                'total_income' => (float)ceil($totalIncome),
                'total_expense' => (float)ceil($totalExpense),
                'net_profit' => (float)ceil($totalIncome - $totalExpense)
            ],
            'records' => $records
        ];
    }

    public function getSummary(?string $dateFrom = null, ?string $dateTo = null) {
        $report = $this->getReport($dateFrom, $dateTo);
        return $report['summary'];
    }

    public function getAll(?string $dateFrom = null, ?string $dateTo = null, ?string $category = null) {
        $report = $this->getReport($dateFrom, $dateTo, $category);
        return $report['records'];
    }

    public function create(array $data) {
        $sql = "INSERT INTO financial_records (date, type, category, amount, description) VALUES (:date, :type, :category, :amount, :description)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'date' => $data['date'] ?? date('Y-m-d'),
            'type' => strtoupper($data['type']),
            'category' => $data['category'],
            'amount' => (float)ceil((float)$data['amount']),
            'description' => $data['description'] ?? ''
        ]);
        return $this->db->lastInsertId();
    }
}
