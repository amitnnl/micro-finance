<?php
require_once __DIR__ . '/../config/Database.php';

class User {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getDb(): PDO {
        return $this->db;
    }

    public function findByEmail(string $email) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(:email)) LIMIT 1");
        $stmt->execute(['email' => $email]);
        return $stmt->fetch();
    }

    public function findById(int $id) {
        $stmt = $this->db->prepare("SELECT id, name, email, phone, role, status, created_at FROM users WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function getAll() {
        try {
            $stmt = $this->db->prepare("SELECT id, name, email, phone, role, status, created_at FROM users ORDER BY id DESC");
            $stmt->execute();
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            $stmt = $this->db->prepare("SELECT id, name, email, phone, role, created_at FROM users ORDER BY id DESC");
            $stmt->execute();
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                $r['status'] = $r['status'] ?? 'active';
            }
            return $rows;
        }
    }

    public function create(array $data) {
        $rawRole = strtolower(trim($data['role'] ?? 'staff'));
        $role = in_array($rawRole, ['admin', 'manager', 'staff']) ? $rawRole : ($rawRole === 'branch manager' ? 'manager' : 'staff');

        try {
            $stmt = $this->db->prepare("INSERT INTO users (name, email, phone, password, role, status) VALUES (:name, :email, :phone, :password, :role, :status)");
            $stmt->execute([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => password_hash($data['password'], PASSWORD_BCRYPT),
                'role' => $role,
                'status' => $data['status'] ?? 'active'
            ]);
            return $this->db->lastInsertId();
        } catch (PDOException $e) {
            $stmt = $this->db->prepare("INSERT INTO users (name, email, phone, password, role) VALUES (:name, :email, :phone, :password, :role)");
            $stmt->execute([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => password_hash($data['password'], PASSWORD_BCRYPT),
                'role' => $role
            ]);
            return $this->db->lastInsertId();
        }
    }

    public function delete(int $id): bool {
        $stmt = $this->db->prepare("DELETE FROM users WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    public function updateStatus(int $id, string $status): bool {
        $cleanStatus = strtolower($status) === 'inactive' ? 'inactive' : 'active';
        $stmt = $this->db->prepare("UPDATE users SET status = :status WHERE id = :id");
        return $stmt->execute(['status' => $cleanStatus, 'id' => $id]);
    }
}
