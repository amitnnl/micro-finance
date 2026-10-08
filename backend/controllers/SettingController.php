<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/AuthHelper.php';

class SettingController {
    private $db;
    private static $defaultSettings = [
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
        'default_penalty_rate' => '0.0658',
        'annual_penalty_rate' => '24.0',
        'grace_period' => '5',
        'max_loan_limit' => '200000',
        'receipt_terms' => 'All payments are non-refundable. Please keep this official receipt for future reference.',
        'signatory_name' => 'Authorized Signatory',
        'signatory_title' => 'Authorized Officer'
    ];

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
        $this->ensureSettingsTable();
    }

    private function ensureSettingsTable() {
        $query = "CREATE TABLE IF NOT EXISTS `settings` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `setting_key` VARCHAR(100) UNIQUE NOT NULL,
            `setting_value` TEXT,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $this->db->exec($query);

        // Check if table is empty
        $stmt = $this->db->query("SELECT COUNT(*) as cnt FROM `settings`");
        $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : ['cnt' => 0];

        if ((int)($row['cnt'] ?? 0) === 0) {
            $ins = $this->db->prepare("INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES (:k, :v)");
            foreach (self::$defaultSettings as $k => $v) {
                if (preg_match('/^[a-zA-Z0-9_]+$/', $k) && !is_array($v) && !is_object($v)) {
                    $ins->execute([':k' => $k, ':v' => (string)$v]);
                }
            }
        } else {
            // Populate any newly introduced default keys without touching existing customized values
            $insMissing = $this->db->prepare("INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES (:k, :v)");
            foreach (self::$defaultSettings as $k => $v) {
                try {
                    $insMissing->execute([':k' => $k, ':v' => (string)$v]);
                } catch (Exception $e) {}
            }
        }
    }

    public function getSettings() {
        try {
            $stmt = $this->db->query("SELECT setting_key, setting_value FROM `settings`");
            $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

            $settings = [];
            foreach ($rows as $row) {
                $k = trim($row['setting_key'] ?? '');
                if (preg_match('/^[a-zA-Z0-9_]+$/', $k)) {
                    $settings[$k] = $row['setting_value'];
                }
            }

            // Merge with defaults for any missing keys
            $merged = array_merge(self::$defaultSettings, $settings);

            Response::json(true, 'Settings retrieved successfully', ['settings' => $merged]);
        } catch (Exception $e) {
            Response::error('Database error: ' . $e->getMessage(), 500);
        }
    }

    public function updateSettings() {
        AuthHelper::requireRole(['admin']);
        try {
            $rawInput = file_get_contents('php://input');
            $data = json_decode($rawInput, true);

            if (!is_array($data) || empty($data)) {
                if (!empty($_POST)) {
                    $data = $_POST;
                } else {
                    parse_str($rawInput, $parsed);
                    if (!empty($parsed) && is_array($parsed)) {
                        $data = $parsed;
                    }
                }
            }

            // Unwrap if wrapped inside { "settings": { ... } }
            if (isset($data['settings']) && is_array($data['settings'])) {
                $data = $data['settings'];
            }

            // Remove router parameter if passed
            unset($data['route']);

            if (empty($data) || !is_array($data)) {
                Response::error('Invalid settings payload', 400);
            }

            // Sanitize payload to only valid alphanumeric keys and scalar values
            $cleanData = [];
            foreach ($data as $k => $v) {
                $cleanKey = trim((string)$k);
                if (!preg_match('/^[a-zA-Z0-9_]+$/', $cleanKey)) {
                    continue;
                }
                if (is_array($v) || is_object($v)) {
                    continue;
                }
                $cleanData[$cleanKey] = (string)($v ?? '');
            }

            if (empty($cleanData)) {
                Response::error('No valid settings fields provided', 400);
            }

            // Update MySQL database directly
            $stmt = $this->db->prepare("INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES (:key, :val1) ON DUPLICATE KEY UPDATE `setting_value` = :val2");

            foreach ($cleanData as $key => $val) {
                $stmt->execute([':key' => $key, ':val1' => $val, ':val2' => $val]);
            }

            // Fetch the updated settings to return in response
            $stmtAll = $this->db->query("SELECT setting_key, setting_value FROM `settings`");
            $rows = $stmtAll ? $stmtAll->fetchAll(PDO::FETCH_ASSOC) : [];
            $allSettings = [];
            foreach ($rows as $r) {
                if (preg_match('/^[a-zA-Z0-9_]+$/', $r['setting_key'] ?? '')) {
                    $allSettings[$r['setting_key']] = $r['setting_value'];
                }
            }
            $final = array_merge(self::$defaultSettings, $allSettings);

            Response::json(true, 'Institution settings updated successfully!', ['settings' => $final]);
        } catch (Exception $e) {
            Response::error('Database error: ' . $e->getMessage(), 500);
        }
    }
}
?>
