<?php
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/AuthHelper.php';

class UserController {
    private $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    /**
     * List all registered staff & manager users (Admin Only)
     */
    public function index() {
        AuthHelper::requireRole(['admin']);
        $users = $this->userModel->getAll();
        Response::json(true, 'Users list retrieved', ['users' => $users]);
    }

    /**
     * Add a new staff/manager/admin user (Admin Only)
     */
    public function store() {
        AuthHelper::requireRole(['admin']);
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        if (empty($input['name']) || empty($input['email']) || empty($input['password'])) {
            Response::error('Name, Email, and Password are required', 400);
        }

        $existing = $this->userModel->findByEmail($input['email']);
        if ($existing) {
            Response::error('User with this email already exists', 400);
        }

        $id = $this->userModel->create($input);
        Response::json(true, 'User account created successfully', ['user_id' => $id], 201);
    }

    /**
     * Remove / Delete a staff user (Admin Only)
     */
    public function delete() {
        $currentUser = AuthHelper::requireRole(['admin']);
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $id = (int)($input['id'] ?? $_GET['id'] ?? 0);

        if ($id <= 0) {
            Response::error('Valid user ID is required', 400);
        }

        // Prevent admin from deleting their own active logged-in session account
        if ($id === (int)$currentUser['id']) {
            Response::error('You cannot delete your own logged-in administrator account.', 400);
        }

        $user = $this->userModel->findById($id);
        if (!$user) {
            Response::error('User account not found', 404);
        }

        // Prevent deleting primary superadmin email
        $userEmail = strtolower(trim($user['email'] ?? ''));
        if ($userEmail === 'admin@microfinance.com' || $userEmail === 'admin@kaspr.com') {
            Response::error('The primary system administrator account cannot be deleted.', 403);
        }

        $this->userModel->delete($id);
        Response::json(true, "User '{$user['name']}' has been removed successfully.");
    }

    /**
     * Activate or Deactivate a staff account (Admin Only)
     */
    public function toggleStatus() {
        $currentUser = AuthHelper::requireRole(['admin']);
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $id = (int)($input['id'] ?? 0);
        $status = strtolower(trim($input['status'] ?? ''));

        if ($id <= 0 || !in_array($status, ['active', 'inactive'], true)) {
            Response::error('Invalid user ID or status provided', 400);
        }

        if ($id === (int)$currentUser['id']) {
            Response::error('You cannot change status of your own administrator account', 400);
        }

        $this->userModel->updateStatus($id, $status);
        Response::json(true, "User account status changed to {$status}");
    }
}
