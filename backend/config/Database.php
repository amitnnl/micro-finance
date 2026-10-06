<?php
/**
 * Database Connection Class (PDO Singleton)
 * Supports MySQL (via XAMPP/Laragon) with automatic fallback to SQLite for local zero-config execution.
 */
class Database {
    private static $instance = null;
    private $conn;

    private $host = "127.0.0.1";
    private $db_name = "microfin_db";
    private $username = "root";
    private $password = "";
    private $charset = "utf8mb4";

    private function loadEnv(): void {
        $envPaths = [
            __DIR__ . '/../../.env',
            __DIR__ . '/../.env',
            __DIR__ . '/.env'
        ];
        foreach ($envPaths as $path) {
            if (file_exists($path) && is_readable($path)) {
                $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if (empty($line) || strpos($line, '#') === 0) continue;
                    if (strpos($line, '=') !== false) {
                        list($key, $val) = explode('=', $line, 2);
                        $key = trim($key);
                        $val = trim($val, " \t\n\r\0\x0B\"'");
                        if (getenv($key) === false) {
                            putenv("{$key}={$val}");
                            $_ENV[$key] = $val;
                            $_SERVER[$key] = $val;
                        }
                    }
                }
                break;
            }
        }
    }

    private function __construct() {
        $this->loadEnv();

        // Optional direct PHP config file support for hosts that restrict .env
        $configFile = __DIR__ . '/db_config.php';
        if (file_exists($configFile)) {
            $customConfig = include $configFile;
            if (is_array($customConfig)) {
                $this->host = $customConfig['DB_HOST'] ?? $this->host;
                $this->db_name = $customConfig['DB_NAME'] ?? $this->db_name;
                $this->username = $customConfig['DB_USER'] ?? $this->username;
                $this->password = $customConfig['DB_PASS'] ?? $this->password;
            }
        }

        $this->host = getenv('DB_HOST') ?: $this->host;
        $this->db_name = getenv('DB_NAME') ?: $this->db_name;
        $this->username = getenv('DB_USER') !== false ? getenv('DB_USER') : $this->username;
        $this->password = getenv('DB_PASS') !== false ? getenv('DB_PASS') : $this->password;

        try {
            // Attempt MySQL Connection via PDO
            $dsn = "mysql:host={$this->host};dbname={$this->db_name};charset={$this->charset}";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $this->conn = new PDO($dsn, $this->username, $this->password, $options);

            // Auto-heal / Ensure schema & default admin credentials exist
            require_once __DIR__ . '/Schema.php';
            Schema::ensure($this->conn);
        } catch (PDOException $e) {
            // Strict MySQL mode: Fail explicitly so administrator/developer is immediately informed
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                "success" => false,
                "message" => "Database Connection Error: Unable to connect to MySQL database '{$this->db_name}' on '{$this->host}'. Please ensure MySQL service is started in XAMPP or verify database credentials in .env.",
                "error_code" => $e->getCode(),
                "error_details" => $e->getMessage()
            ]);
            exit();
        }
    }

    public static function getInstance(): Database {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection(): PDO {
        return $this->conn;
    }
}
