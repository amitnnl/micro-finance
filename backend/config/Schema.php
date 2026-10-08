<?php
/**
 * Database Schema Auto-Initializer & Migration Helper
 * Ensures all required tables and default admin account exist automatically.
 */
class Schema {
    private static $ensured = false;

    public static function ensure(PDO $db, bool $force = false): void {
        if (self::$ensured && !$force) {
            return;
        }

        try {
            self::createTables($db);
            self::upgradeColumns($db);
            self::seedDefaultAdmin($db);
            self::seedDefaultSettings($db);
            self::$ensured = true;
        } catch (Exception $e) {
            // Ignore non-fatal ensure errors
        }
    }

    public static function upgradeColumns(PDO $db): void {
        $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            try { $db->exec("ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(20) NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `users` ADD COLUMN `role` ENUM('admin', 'manager', 'staff') DEFAULT 'staff'"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `users` ADD COLUMN `status` ENUM('active', 'inactive') DEFAULT 'active'"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` ADD COLUMN `lead_date` DATE NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` ADD COLUMN `application_date` DATE NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` ADD COLUMN `disbursement_date` DATE NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` ADD COLUMN `approval_date` DATE NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` ADD COLUMN `approval_notes` TEXT NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` ADD COLUMN `disbursement_mode` VARCHAR(50) NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` ADD COLUMN `disbursement_reference` VARCHAR(100) NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` MODIFY COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'Pending Approval'"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` MODIFY COLUMN `doc_aadhaar` LONGTEXT NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` MODIFY COLUMN `doc_pan` LONGTEXT NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` MODIFY COLUMN `doc_photo` LONGTEXT NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` MODIFY COLUMN `doc_passbook` LONGTEXT NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` MODIFY COLUMN `doc_address_proof` LONGTEXT NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` MODIFY COLUMN `doc_co_aadhaar` LONGTEXT NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `loans` MODIFY COLUMN `doc_guarantor_aadhaar` LONGTEXT NULL"); } catch (Exception $e) {}
        }
    }

    public static function createTables(PDO $db): void {
        $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);

        if ($driver === 'mysql') {
            $db->exec("SET FOREIGN_KEY_CHECKS = 0");

            // 1. Users Table
            $db->exec("CREATE TABLE IF NOT EXISTS `users` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `email` VARCHAR(150) NOT NULL UNIQUE,
                `phone` VARCHAR(20) DEFAULT NULL,
                `password` VARCHAR(255) NOT NULL,
                `role` ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
                `status` ENUM('active', 'inactive') DEFAULT 'active',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_users_email` (`email`),
                INDEX `idx_users_role` (`role`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // 2. Loans Table
            $db->exec("CREATE TABLE IF NOT EXISTS `loans` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `loan_no` VARCHAR(50) NOT NULL UNIQUE,
                `customer_id` VARCHAR(50) DEFAULT NULL,
                `agreement_no` VARCHAR(50) DEFAULT NULL,
                `customer_name` VARCHAR(150) NOT NULL,
                `father_husband_name` VARCHAR(150) DEFAULT NULL,
                `phone` VARCHAR(20) NOT NULL,
                `alternate_phone` VARCHAR(20) DEFAULT NULL,
                `dob` DATE DEFAULT NULL,
                `gender` ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
                `aadhaar_number` VARCHAR(20) DEFAULT NULL,
                `pan_number` VARCHAR(20) DEFAULT NULL,
                `address` TEXT DEFAULT NULL,
                `district` VARCHAR(100) DEFAULT NULL,
                `state` VARCHAR(100) DEFAULT 'Haryana',
                `pin_code` VARCHAR(10) DEFAULT NULL,
                `co_applicant_name` VARCHAR(150) DEFAULT NULL,
                `co_applicant_father_husband` VARCHAR(150) DEFAULT NULL,
                `co_applicant_phone` VARCHAR(20) DEFAULT NULL,
                `co_applicant_dob` DATE DEFAULT NULL,
                `co_applicant_gender` ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
                `co_applicant_aadhaar` VARCHAR(20) DEFAULT NULL,
                `co_applicant_pan` VARCHAR(20) DEFAULT NULL,
                `co_applicant_address` TEXT DEFAULT NULL,
                `co_applicant_district` VARCHAR(100) DEFAULT NULL,
                `co_applicant_state` VARCHAR(100) DEFAULT 'Haryana',
                `co_applicant_pin` VARCHAR(10) DEFAULT NULL,
                `guarantor_name` VARCHAR(150) DEFAULT NULL,
                `guarantor_father_husband` VARCHAR(150) DEFAULT NULL,
                `guarantor_phone` VARCHAR(20) DEFAULT NULL,
                `guarantor_dob` DATE DEFAULT NULL,
                `guarantor_gender` ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
                `guarantor_aadhaar` VARCHAR(20) DEFAULT NULL,
                `guarantor_pan` VARCHAR(20) DEFAULT NULL,
                `guarantor_address` TEXT DEFAULT NULL,
                `guarantor_district` VARCHAR(100) DEFAULT NULL,
                `guarantor_state` VARCHAR(100) DEFAULT 'Haryana',
                `guarantor_pin` VARCHAR(10) DEFAULT NULL,
                `loan_purpose_code` VARCHAR(10) DEFAULT 'AH',
                `loan_purpose_title` VARCHAR(150) DEFAULT 'Animal Husbandry Loan',
                `loan_amount` DECIMAL(12,0) NOT NULL,
                `interest_rate` DECIMAL(5,2) NOT NULL DEFAULT 35.00,
                `tenure_months` INT NOT NULL DEFAULT 24,
                `emi_amount` DECIMAL(12,0) NOT NULL,
                `total_payment` DECIMAL(12,0) NOT NULL,
                `interest_amount` DECIMAL(12,0) NOT NULL,
                `balance_outstanding` DECIMAL(12,0) NOT NULL,
                `received_count` INT DEFAULT 0,
                `pending_count` INT DEFAULT 0,
                `next_due_date` DATE DEFAULT NULL,
                `status` VARCHAR(30) NOT NULL DEFAULT 'Pending Approval',
                `lead_date` DATE DEFAULT NULL,
                `application_date` DATE DEFAULT NULL,
                `approval_date` DATE DEFAULT NULL,
                `approval_notes` TEXT DEFAULT NULL,
                `disbursement_date` DATE DEFAULT NULL,
                `disbursement_mode` VARCHAR(50) DEFAULT NULL,
                `disbursement_reference` VARCHAR(100) DEFAULT NULL,
                `employment_type` VARCHAR(100) DEFAULT 'Salaried',
                `occupation` VARCHAR(150) DEFAULT NULL,
                `monthly_income_range` VARCHAR(100) DEFAULT NULL,
                `earning_members` INT DEFAULT 1,
                `bank_account_no` VARCHAR(50) DEFAULT NULL,
                `bank_ifsc` VARCHAR(20) DEFAULT NULL,
                `bank_micr` VARCHAR(20) DEFAULT NULL,
                `bank_name` VARCHAR(150) DEFAULT NULL,
                `account_holder_name` VARCHAR(150) DEFAULT NULL,
                `reference_name` VARCHAR(150) DEFAULT NULL,
                `reference_phone` VARCHAR(20) DEFAULT NULL,
                `reference_relation` VARCHAR(50) DEFAULT NULL,
                `doc_aadhaar` VARCHAR(255) DEFAULT NULL,
                `doc_pan` VARCHAR(255) DEFAULT NULL,
                `doc_photo` VARCHAR(255) DEFAULT NULL,
                `doc_passbook` VARCHAR(255) DEFAULT NULL,
                `doc_address_proof` VARCHAR(255) DEFAULT NULL,
                `doc_co_aadhaar` VARCHAR(255) DEFAULT NULL,
                `doc_guarantor_aadhaar` VARCHAR(255) DEFAULT NULL,
                `terms_accepted` TINYINT(1) DEFAULT 1,
                `additional_notes` TEXT DEFAULT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_loans_status` (`status`),
                INDEX `idx_loans_phone` (`phone`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // 3. EMI Payments Table
            $db->exec("CREATE TABLE IF NOT EXISTS `emi_payments` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `loan_id` INT NOT NULL,
                `receipt_no` VARCHAR(50) NOT NULL UNIQUE,
                `emi_amount` DECIMAL(12,0) NOT NULL,
                `penalty_amount` DECIMAL(10,0) DEFAULT 0,
                `total_paid` DECIMAL(12,0) NOT NULL,
                `payment_date` DATE NOT NULL,
                `payment_mode` ENUM('Cash', 'UPI', 'Bank Transfer', 'Cheque') DEFAULT 'Cash',
                `notes` TEXT DEFAULT NULL,
                `status` ENUM('Received', 'Pending', 'Cancelled') DEFAULT 'Received',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON DELETE CASCADE,
                INDEX `idx_emi_loan_id` (`loan_id`),
                INDEX `idx_emi_payment_date` (`payment_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // 4. Appointments Table
            $db->exec("CREATE TABLE IF NOT EXISTS `appointments` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `appointment_no` VARCHAR(50) NOT NULL UNIQUE,
                `client_name` VARCHAR(150) NOT NULL,
                `phone` VARCHAR(20) NOT NULL,
                `aadhaar_number` VARCHAR(20) DEFAULT NULL,
                `loan_amount` DECIMAL(12,0) DEFAULT 0,
                `lead_date` DATE DEFAULT NULL,
                `source_type` VARCHAR(50) DEFAULT 'Direct',
                `referral_name` VARCHAR(150) DEFAULT NULL,
                `email` VARCHAR(150) DEFAULT NULL,
                `address` TEXT DEFAULT NULL,
                `city` VARCHAR(100) DEFAULT NULL,
                `appointment_date` DATE DEFAULT NULL,
                `status` VARCHAR(50) DEFAULT 'Pending',
                `reject_reason` TEXT DEFAULT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // 5. Leads Table
            $db->exec("CREATE TABLE IF NOT EXISTS `leads` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `lead_no` VARCHAR(50) NOT NULL UNIQUE,
                `name` VARCHAR(150) NOT NULL,
                `phone` VARCHAR(20) NOT NULL,
                `email` VARCHAR(150) DEFAULT NULL,
                `city` VARCHAR(100) DEFAULT NULL,
                `loan_type` VARCHAR(100) DEFAULT 'Personal Loan',
                `amount` DECIMAL(12,0) DEFAULT 0,
                `status` VARCHAR(50) DEFAULT 'Pending',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // 6. Financial Records (Profit & Loss) Table
            $db->exec("CREATE TABLE IF NOT EXISTS `financial_records` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `date` DATE NOT NULL,
                `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
                `category` VARCHAR(100) NOT NULL,
                `amount` DECIMAL(12,0) NOT NULL,
                `description` TEXT DEFAULT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // 7. Settings Table
            $db->exec("CREATE TABLE IF NOT EXISTS `settings` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `setting_key` VARCHAR(100) UNIQUE NOT NULL,
                `setting_value` TEXT,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            $db->exec("SET FOREIGN_KEY_CHECKS = 1");
        } else if ($driver === 'sqlite') {
            $db->exec("CREATE TABLE IF NOT EXISTS `users` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT,
                `name` TEXT NOT NULL,
                `email` TEXT NOT NULL UNIQUE,
                `phone` TEXT DEFAULT NULL,
                `password` TEXT NOT NULL,
                `role` TEXT DEFAULT 'staff',
                `status` TEXT DEFAULT 'active',
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
            )");

            $db->exec("CREATE TABLE IF NOT EXISTS `loans` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT,
                `loan_no` TEXT NOT NULL UNIQUE,
                `customer_id` TEXT DEFAULT NULL,
                `agreement_no` TEXT DEFAULT NULL,
                `customer_name` TEXT NOT NULL,
                `father_husband_name` TEXT DEFAULT NULL,
                `phone` TEXT NOT NULL,
                `alternate_phone` TEXT DEFAULT NULL,
                `dob` DATE DEFAULT NULL,
                `gender` TEXT DEFAULT 'Male',
                `aadhaar_number` TEXT DEFAULT NULL,
                `pan_number` TEXT DEFAULT NULL,
                `address` TEXT DEFAULT NULL,
                `district` TEXT DEFAULT NULL,
                `state` TEXT DEFAULT 'Haryana',
                `pin_code` TEXT DEFAULT NULL,
                `co_applicant_name` TEXT DEFAULT NULL,
                `co_applicant_father_husband` TEXT DEFAULT NULL,
                `co_applicant_phone` TEXT DEFAULT NULL,
                `co_applicant_dob` DATE DEFAULT NULL,
                `co_applicant_gender` TEXT DEFAULT 'Male',
                `co_applicant_aadhaar` TEXT DEFAULT NULL,
                `co_applicant_pan` TEXT DEFAULT NULL,
                `co_applicant_address` TEXT DEFAULT NULL,
                `co_applicant_district` TEXT DEFAULT NULL,
                `co_applicant_state` TEXT DEFAULT 'Haryana',
                `co_applicant_pin` TEXT DEFAULT NULL,
                `guarantor_name` TEXT DEFAULT NULL,
                `guarantor_father_husband` TEXT DEFAULT NULL,
                `guarantor_phone` TEXT DEFAULT NULL,
                `guarantor_dob` DATE DEFAULT NULL,
                `guarantor_gender` TEXT DEFAULT 'Male',
                `guarantor_aadhaar` TEXT DEFAULT NULL,
                `guarantor_pan` TEXT DEFAULT NULL,
                `guarantor_address` TEXT DEFAULT NULL,
                `guarantor_district` TEXT DEFAULT NULL,
                `guarantor_state` TEXT DEFAULT 'Haryana',
                `guarantor_pin` TEXT DEFAULT NULL,
                `loan_purpose_code` TEXT DEFAULT 'AH',
                `loan_purpose_title` TEXT DEFAULT 'Animal Husbandry Loan',
                `loan_amount` NUMERIC NOT NULL,
                `interest_rate` NUMERIC NOT NULL DEFAULT 35.00,
                `tenure_months` INTEGER NOT NULL DEFAULT 24,
                `emi_amount` NUMERIC NOT NULL,
                `total_payment` NUMERIC NOT NULL,
                `interest_amount` NUMERIC NOT NULL,
                `balance_outstanding` NUMERIC NOT NULL,
                `received_count` INTEGER DEFAULT 0,
                `pending_count` INTEGER DEFAULT 0,
                `next_due_date` DATE DEFAULT NULL,
                `status` TEXT NOT NULL DEFAULT 'Pending Approval',
                `lead_date` DATE DEFAULT NULL,
                `application_date` DATE DEFAULT NULL,
                `approval_date` DATE DEFAULT NULL,
                `approval_notes` TEXT DEFAULT NULL,
                `disbursement_date` DATE DEFAULT NULL,
                `disbursement_mode` TEXT DEFAULT NULL,
                `disbursement_reference` TEXT DEFAULT NULL,
                `employment_type` TEXT DEFAULT 'Salaried',
                `occupation` TEXT DEFAULT NULL,
                `monthly_income_range` TEXT DEFAULT NULL,
                `earning_members` INTEGER DEFAULT 1,
                `bank_account_no` TEXT DEFAULT NULL,
                `bank_ifsc` TEXT DEFAULT NULL,
                `bank_micr` TEXT DEFAULT NULL,
                `bank_name` TEXT DEFAULT NULL,
                `account_holder_name` TEXT DEFAULT NULL,
                `reference_name` TEXT DEFAULT NULL,
                `reference_phone` TEXT DEFAULT NULL,
                `reference_relation` TEXT DEFAULT NULL,
                `doc_aadhaar` TEXT DEFAULT NULL,
                `doc_pan` TEXT DEFAULT NULL,
                `doc_photo` TEXT DEFAULT NULL,
                `doc_passbook` TEXT DEFAULT NULL,
                `doc_address_proof` TEXT DEFAULT NULL,
                `doc_co_aadhaar` TEXT DEFAULT NULL,
                `doc_guarantor_aadhaar` TEXT DEFAULT NULL,
                `terms_accepted` INTEGER DEFAULT 1,
                `additional_notes` TEXT DEFAULT NULL,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
            )");

            $db->exec("CREATE TABLE IF NOT EXISTS `emi_payments` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT,
                `loan_id` INTEGER NOT NULL,
                `receipt_no` TEXT NOT NULL UNIQUE,
                `emi_amount` NUMERIC NOT NULL,
                `penalty_amount` NUMERIC DEFAULT 0,
                `total_paid` NUMERIC NOT NULL,
                `payment_date` DATE NOT NULL,
                `payment_mode` TEXT DEFAULT 'Cash',
                `notes` TEXT DEFAULT NULL,
                `status` TEXT DEFAULT 'Received',
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
            )");

            $db->exec("CREATE TABLE IF NOT EXISTS `appointments` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT,
                `appointment_no` TEXT NOT NULL UNIQUE,
                `client_name` TEXT NOT NULL,
                `phone` TEXT NOT NULL,
                `aadhaar_number` TEXT DEFAULT NULL,
                `loan_amount` NUMERIC DEFAULT 0,
                `lead_date` DATE DEFAULT NULL,
                `source_type` TEXT DEFAULT 'Direct',
                `referral_name` TEXT DEFAULT NULL,
                `email` TEXT DEFAULT NULL,
                `address` TEXT DEFAULT NULL,
                `city` TEXT DEFAULT NULL,
                `appointment_date` DATE DEFAULT NULL,
                `status` TEXT DEFAULT 'Pending',
                `reject_reason` TEXT DEFAULT NULL,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
            )");

            $db->exec("CREATE TABLE IF NOT EXISTS `leads` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT,
                `lead_no` TEXT NOT NULL UNIQUE,
                `name` TEXT NOT NULL,
                `phone` TEXT NOT NULL,
                `email` TEXT DEFAULT NULL,
                `city` TEXT DEFAULT NULL,
                `loan_type` TEXT DEFAULT 'Personal Loan',
                `amount` NUMERIC DEFAULT 0,
                `status` TEXT DEFAULT 'Pending',
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
            )");

            $db->exec("CREATE TABLE IF NOT EXISTS `financial_records` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT,
                `date` DATE NOT NULL,
                `type` TEXT NOT NULL,
                `category` TEXT NOT NULL,
                `amount` NUMERIC NOT NULL,
                `description` TEXT DEFAULT NULL,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
            )");

            $db->exec("CREATE TABLE IF NOT EXISTS `settings` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT,
                `setting_key` TEXT UNIQUE NOT NULL,
                `setting_value` TEXT,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
        }
    }

    public static function seedDefaultAdmin(PDO $db): void {
        $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            try { $db->exec("ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(20) NULL"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `users` ADD COLUMN `role` ENUM('admin', 'manager', 'staff') DEFAULT 'staff'"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `users` ADD COLUMN `status` ENUM('active', 'inactive') DEFAULT 'active'"); } catch (Exception $e) {}
            try { $db->exec("ALTER TABLE `appointments` ADD COLUMN `referral_name` VARCHAR(150) NULL DEFAULT NULL"); } catch (Exception $e) {}
        }
        $hash = '$2y$10$Q0rFQWNNitaIrHug8NdXE.pCMSH6KdjEXJJ0e6rfpp0yIhSor6gbu'; // bcrypt of admin123

        try {
            $stmt = $db->prepare("SELECT id, password FROM `users` WHERE `email` = 'admin@microfinance.com' LIMIT 1");
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$user) {
                $insert = $db->prepare("INSERT INTO `users` (`name`, `email`, `phone`, `password`, `role`, `status`) 
                    VALUES ('Admin User', 'admin@microfinance.com', '9876543210', :pass, 'admin', 'active')");
                $insert->execute([':pass' => $hash]);
            } else if (!password_verify('admin123', $user['password'])) {
                $up = $db->prepare("UPDATE `users` SET `password` = :pass, `role` = 'admin', `status` = 'active' WHERE `id` = :id");
                $up->execute([':pass' => $hash, ':id' => $user['id']]);
            }
        } catch (Exception $e) {
            // Ignore non-critical seed errors
        }

        try {
            $db->exec("DELETE FROM `users` WHERE `email` = 'admin@kaspr.com'");
        } catch (Exception $e) {}
    }

    public static function seedDefaultSettings(PDO $db): void {
        try {
            $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
            $stmt = $db->query("SELECT COUNT(*) FROM `settings`");
            $count = ($stmt !== false) ? (int)$stmt->fetchColumn() : 0;

            $defaults = [
                'institution_name' => 'Microfinance Institution',
                'tagline' => 'Registered Non-Banking Financial Company (NBFC - MFI)',
                'cin_number' => 'U65929RJ2024NPL089123',
                'branch_code' => 'BR-001',
                'phone' => '+91 99910 95051',
                'email' => 'info@microfinance.com',
                'address' => 'Main Branch Office',
                'city' => 'Narnaul',
                'state' => 'Haryana',
                'pincode' => '123001',
                'default_interest_rate' => '14.5',
                'default_processing_fee' => '2.0',
                'default_penalty_rate' => '1.5',
                'grace_period' => '5',
                'max_loan_limit' => '200000',
                'receipt_terms' => 'All payments are non-refundable. Please keep this official receipt for future reference.',
                'signatory_name' => 'Authorized Signatory',
                'signatory_title' => 'Authorized Officer'
            ];

            if ($count === 0) {
                // If table is completely empty, try checking if the companion database has custom settings!
                $companionData = [];
                try {
                    if ($driver === 'mysql') {
                        $sqPath = __DIR__ . '/../../database.sqlite';
                        if (file_exists($sqPath)) {
                            $sq = new PDO("sqlite:" . $sqPath);
                            $st = $sq->query("SELECT setting_key, setting_value FROM settings");
                            if ($st) $companionData = $st->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];
                        }
                    } else {
                        $host = getenv('DB_HOST') ?: '127.0.0.1';
                        $myDbName = getenv('DB_NAME') ?: 'microfin_db';
                        $user = getenv('DB_USER') !== false ? getenv('DB_USER') : 'root';
                        $pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
                        $my = new PDO("mysql:host={$host};dbname={$myDbName};charset=utf8mb4", $user, $pass, [
                            PDO::ATTR_TIMEOUT => 2
                        ]);
                        $st = $my->query("SELECT setting_key, setting_value FROM settings");
                        if ($st) $companionData = $st->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];
                    }
                } catch (Exception $e) {}

                $seedData = !empty($companionData) ? $companionData : $defaults;

                if ($driver === 'sqlite') {
                    $ins = $db->prepare("INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES (:k, :v)");
                } else {
                    $ins = $db->prepare("INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES (:k, :v)");
                }
                foreach ($seedData as $k => $v) {
                    if (preg_match('/^[a-zA-Z0-9_]+$/', $k) && !is_array($v) && !is_object($v)) {
                        $ins->execute([':k' => $k, ':v' => (string)$v]);
                    }
                }
            } else {
                // Ensure any missing default keys are populated without overwriting existing customized values
                if ($driver === 'sqlite') {
                    $insMissing = $db->prepare("INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES (:k, :v)");
                } else {
                    $insMissing = $db->prepare("INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES (:k, :v)");
                }
                foreach ($defaults as $k => $v) {
                    try {
                        $insMissing->execute([':k' => $k, ':v' => (string)$v]);
                    } catch (Exception $e) {}
                }
            }
        } catch (Exception $e) {
            // Non-critical
        }
    }
}
