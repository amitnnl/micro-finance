<?php
require_once __DIR__ . '/config/Database.php';
require_once __DIR__ . '/config/Schema.php';

try {
    $db = Database::getInstance()->getConnection();
    $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
    echo "Connected using driver: {$driver}\n";

    // 1. Ensure all core tables, default admin, and default settings exist
    Schema::ensure($db, true);

    // 1b. Ensure users table columns & default admin credentials
    if ($driver === 'mysql') {
        try { $db->exec("ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(20) NULL"); } catch (Exception $e) {}
        try { $db->exec("ALTER TABLE `users` ADD COLUMN `role` ENUM('admin', 'manager', 'staff') DEFAULT 'staff'"); } catch (Exception $e) {}
        try { $db->exec("ALTER TABLE `users` ADD COLUMN `status` ENUM('active', 'inactive') DEFAULT 'active'"); } catch (Exception $e) {}
    }

    $defaultHash = '$2y$10$Q0rFQWNNitaIrHug8NdXE.pCMSH6KdjEXJJ0e6rfpp0yIhSor6gbu'; // admin123
    $fixAdmins = [
        ['name' => 'Admin User', 'email' => 'admin@microfinance.com', 'phone' => '9876543210']
    ];
    try { $db->exec("DELETE FROM `users` WHERE `email` = 'admin@kaspr.com'"); } catch (Exception $e) {}
    foreach ($fixAdmins as $adm) {
        $st = $db->prepare("SELECT id, password FROM `users` WHERE `email` = :em LIMIT 1");
        $st->execute([':em' => $adm['email']]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            $ins = $db->prepare("INSERT INTO `users` (`name`, `email`, `phone`, `password`, `role`, `status`) VALUES (:n, :e, :p, :pass, 'admin', 'active')");
            $ins->execute([':n' => $adm['name'], ':e' => $adm['email'], ':p' => $adm['phone'], ':pass' => $defaultHash]);
            echo "Created default admin: {$adm['email']}\n";
        } else if (!password_verify('admin123', $row['password'])) {
            $up = $db->prepare("UPDATE `users` SET `password` = :pass, `role` = 'admin', `status` = 'active' WHERE `id` = :id");
            $up->execute([':pass' => $defaultHash, ':id' => $row['id']]);
            echo "Updated default admin password: {$adm['email']}\n";
        }
    }
    echo "Core tables, default admin (admin@microfinance.com / admin123), and settings verified.\n";

    // 2. Incremental column upgrades
    try {
        $db->exec("ALTER TABLE loans ADD COLUMN disbursement_date DATE NULL");
        echo "Added disbursement_date.\n";
    } catch (Exception $e) {}

    try {
        $db->exec("ALTER TABLE loans ADD COLUMN approval_date DATE NULL");
        echo "Added approval_date.\n";
    } catch (Exception $e) {}

    try {
        $db->exec("ALTER TABLE loans ADD COLUMN approval_notes TEXT NULL");
        echo "Added approval_notes.\n";
    } catch (Exception $e) {}

    try {
        $db->exec("ALTER TABLE loans ADD COLUMN disbursement_mode VARCHAR(50) NULL");
        echo "Added disbursement_mode.\n";
    } catch (Exception $e) {}

    try {
        $db->exec("ALTER TABLE loans ADD COLUMN disbursement_reference VARCHAR(100) NULL");
        echo "Added disbursement_reference.\n";
    } catch (Exception $e) {}

    if ($driver === 'mysql') {
        try {
            $db->exec("ALTER TABLE loans MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'Pending Approval'");
            echo "Status column successfully upgraded to VARCHAR(30) DEFAULT 'Pending Approval'.\n";
        } catch (Exception $e) {}
    }

    // 3. Upgrade existing loan amounts with round off increasing (CEIL) - zero paisa
    try {
        $stmtLoans = $db->query("SELECT id, loan_amount, tenure_months, emi_amount, received_count FROM loans");
        if ($stmtLoans) {
            $allLoans = $stmtLoans->fetchAll(PDO::FETCH_ASSOC);
            foreach ($allLoans as $l) {
                $p = (float)ceil((float)$l['loan_amount']);
                $emi = (float)ceil((float)$l['emi_amount']);
                $tenure = (int)$l['tenure_months'];
                $total = (float)ceil($emi * $tenure);
                $interest = (float)ceil($total - $p);
                $recCount = (int)($l['received_count'] ?? 0);
                $balance = max(0, (float)ceil($total - ($emi * $recCount)));

                $upStmt = $db->prepare("UPDATE loans SET 
                    loan_amount = :p,
                    emi_amount = :emi,
                    total_payment = :total,
                    interest_amount = :interest,
                    balance_outstanding = :balance
                    WHERE id = :id");
                $upStmt->execute([
                    'p' => $p,
                    'emi' => $emi,
                    'total' => $total,
                    'interest' => $interest,
                    'balance' => $balance,
                    'id' => $l['id']
                ]);
            }
            if (count($allLoans) > 0) {
                echo "Updated existing loans with round off increasing (CEIL).\n";
            }
        }
    } catch (Exception $e) {}

    // 4. Round up existing emi_payments and financial_records
    try {
        $stmtEmi = $db->query("SELECT id, emi_amount, penalty_amount, total_paid FROM emi_payments");
        if ($stmtEmi) {
            $allEmis = $stmtEmi->fetchAll(PDO::FETCH_ASSOC);
            foreach ($allEmis as $em) {
                $upEmi = $db->prepare("UPDATE emi_payments SET 
                    emi_amount = :emi,
                    penalty_amount = :pen,
                    total_paid = :total
                    WHERE id = :id");
                $upEmi->execute([
                    'emi' => (float)ceil((float)$em['emi_amount']),
                    'pen' => (float)ceil((float)$em['penalty_amount']),
                    'total' => (float)ceil((float)$em['total_paid']),
                    'id' => $em['id']
                ]);
            }
            if (count($allEmis) > 0) {
                echo "Updated existing emi_payments with CEIL.\n";
            }
        }
    } catch (Exception $e) {}

    try {
        $stmtFin = $db->query("SELECT id, amount FROM financial_records");
        if ($stmtFin) {
            $allFin = $stmtFin->fetchAll(PDO::FETCH_ASSOC);
            foreach ($allFin as $fn) {
                $upFin = $db->prepare("UPDATE financial_records SET amount = :amt WHERE id = :id");
                $upFin->execute([
                    'amt' => (float)ceil((float)$fn['amount']),
                    'id' => $fn['id']
                ]);
            }
            if (count($allFin) > 0) {
                echo "Updated existing financial_records with CEIL.\n";
            }
        }
    } catch (Exception $e) {}

    if ($driver === 'mysql') {
        try {
            $db->exec("ALTER TABLE loans 
                MODIFY COLUMN loan_amount DECIMAL(12,0) NOT NULL,
                MODIFY COLUMN emi_amount DECIMAL(12,0) NOT NULL,
                MODIFY COLUMN total_payment DECIMAL(12,0) NOT NULL,
                MODIFY COLUMN interest_amount DECIMAL(12,0) NOT NULL,
                MODIFY COLUMN balance_outstanding DECIMAL(12,0) NOT NULL");
            echo "Upgraded loans table columns to DECIMAL(12,0).\n";
        } catch (Exception $e) {}

        try {
            $db->exec("ALTER TABLE emi_payments 
                MODIFY COLUMN emi_amount DECIMAL(12,0) NOT NULL,
                MODIFY COLUMN penalty_amount DECIMAL(10,0) DEFAULT 0,
                MODIFY COLUMN total_paid DECIMAL(12,0) NOT NULL");
            echo "Upgraded emi_payments table columns to DECIMAL(12,0).\n";
        } catch (Exception $e) {}

        try {
            $db->exec("ALTER TABLE financial_records MODIFY COLUMN amount DECIMAL(12,0) NOT NULL");
            echo "Upgraded financial_records table columns to DECIMAL(12,0).\n";
        } catch (Exception $e) {}
    }

    echo "Migration completed successfully!\n";
} catch (PDOException $e) {
    echo "Migration error: " . $e->getMessage() . "\n";
}
