-- Microfinance CRM Database Schema
-- Compatible with MySQL 5.7+, MySQL 8.0+, MariaDB, cPanel phpMyAdmin, and Cloud VPS.
--
-- NOTE FOR CPANEL / SHARED HOSTING USERS:
-- If you created a database in cPanel (e.g., `user_microfin`), select that database
-- in phpMyAdmin first, then import this file. Lines below create the DB if running on root/VPS.
CREATE DATABASE IF NOT EXISTS `microfin_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE `microfin_db`;


-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Loans Table (Full 6-Step Schema)
CREATE TABLE IF NOT EXISTS `loans` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `loan_no` VARCHAR(50) NOT NULL UNIQUE,
    `customer_id` VARCHAR(50) DEFAULT NULL,
    `agreement_no` VARCHAR(50) DEFAULT NULL,
    
    -- Step 1: Personal Details
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

    -- Step 2: Co-Applicant Information
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

    -- Step 3: Guarantor Information
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

    -- Step 4: Loan Details & Purpose
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

    -- Step 5: Income and Employment Information
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

    -- Step 6: Documents and Consent
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. EMI Payments Table
CREATE TABLE IF NOT EXISTS `emi_payments` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Appointments / Create Lead Table
CREATE TABLE IF NOT EXISTS `appointments` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Leads Table
CREATE TABLE IF NOT EXISTS `leads` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Financial Records (Profit & Loss) Table
CREATE TABLE IF NOT EXISTS `financial_records` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `date` DATE NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(12,0) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Settings Table
CREATE TABLE IF NOT EXISTS `settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) UNIQUE NOT NULL,
    `setting_value` TEXT,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data: Default Admin Accounts (Password: admin123)
INSERT INTO `users` (`name`, `email`, `phone`, `password`, `role`, `status`) VALUES
('Admin User', 'admin@microfinance.com', '9876543210', '$2y$10$Q0rFQWNNitaIrHug8NdXE.pCMSH6KdjEXJJ0e6rfpp0yIhSor6gbu', 'admin', 'active')
ON DUPLICATE KEY UPDATE `password` = VALUES(`password`), `role` = 'admin', `status` = 'active';

-- Default Settings
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('institution_name', 'Microfinance Institution'),
('tagline', 'Registered Non-Banking Financial Company (NBFC - MFI)'),
('cin_number', 'U65929RJ2024NPL089123'),
('branch_code', 'BR-001'),
('phone', '+91 99910 95051'),
('email', 'info@microfinance.com'),
('address', 'Main Branch Office'),
('city', 'Narnaul'),
('state', 'Haryana'),
('pincode', '123001'),
('default_interest_rate', '14.5'),
('default_processing_fee', '2.0'),
('default_penalty_rate', '0.0658'),
('annual_penalty_rate', '24.0'),
('grace_period', '5'),
('max_loan_limit', '200000'),
('receipt_terms', 'All payments are non-refundable. Please keep this official receipt for future reference.'),
('signatory_name', 'Authorized Signatory'),
('signatory_title', 'Authorized Officer')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

