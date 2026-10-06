<?php
/**
 * Central REST API Router
 * Handles CORS, route matching, and dispatches requests to appropriate controllers.
 */

require_once __DIR__ . '/../config/Cors.php';
require_once __DIR__ . '/../helpers/Response.php';

// Enable CORS
handleCors();

// Determine route parameter
$route = $_GET['route'] ?? $_SERVER['PATH_INFO'] ?? '';
$route = trim($route, '/');

switch ($route) {
    // --- AUTH ---
    case 'auth/login':
        require_once __DIR__ . '/../controllers/AuthController.php';
        (new AuthController())->login();
        break;

    case 'auth/me':
        require_once __DIR__ . '/../controllers/AuthController.php';
        (new AuthController())->me();
        break;

    // --- LOANS ---
    case 'loans':
        require_once __DIR__ . '/../controllers/LoanController.php';
        $controller = new LoanController();
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $controller->store();
        } else {
            $controller->index();
        }
        break;

    case 'loans/detail':
        require_once __DIR__ . '/../controllers/LoanController.php';
        (new LoanController())->show();
        break;

    case 'loans/disburse':
        require_once __DIR__ . '/../controllers/LoanController.php';
        (new LoanController())->disburse();
        break;

    case 'loans/approve':
        require_once __DIR__ . '/../controllers/LoanController.php';
        (new LoanController())->approve();
        break;

    case 'loans/reject':
        require_once __DIR__ . '/../controllers/LoanController.php';
        (new LoanController())->reject();
        break;

    case 'loans/check-documents':
        require_once __DIR__ . '/../controllers/LoanController.php';
        (new LoanController())->checkDocuments();
        break;

    case 'loans/import-csv':
        require_once __DIR__ . '/../controllers/LoanController.php';
        (new LoanController())->importCsv();
        break;

    case 'loans/export-csv':
        require_once __DIR__ . '/../controllers/LoanController.php';
        (new LoanController())->exportCsv();
        break;

    case 'loans/sample-csv':
        require_once __DIR__ . '/../controllers/LoanController.php';
        (new LoanController())->sampleCsv();
        break;

    case 'dashboard/stats':
        require_once __DIR__ . '/../controllers/LoanController.php';
        (new LoanController())->dashboardStats();
        break;

    // --- PINCODE LOOKUP ---
    case 'pincode/lookup':
        require_once __DIR__ . '/../controllers/PincodeController.php';
        (new PincodeController())->lookup();
        break;

    // --- EMIS ---
    case 'emis/active-loans':
        require_once __DIR__ . '/../controllers/EmiController.php';
        (new EmiController())->activeLoans();
        break;

    case 'emis/pay':
        require_once __DIR__ . '/../controllers/EmiController.php';
        (new EmiController())->processPayment();
        break;

    case 'emis/statement':
        require_once __DIR__ . '/../controllers/EmiController.php';
        (new EmiController())->statement();
        break;

    // --- LEADS ---
    case 'leads':
        require_once __DIR__ . '/../controllers/LeadController.php';
        $controller = new LeadController();
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $controller->store();
        } else {
            $controller->index();
        }
        break;

    case 'leads/status':
        require_once __DIR__ . '/../controllers/LeadController.php';
        (new LeadController())->updateStatus();
        break;

    case 'leads/export-csv':
        require_once __DIR__ . '/../controllers/LeadController.php';
        (new LeadController())->exportCsv();
        break;

    case 'leads/import-csv':
        require_once __DIR__ . '/../controllers/LeadController.php';
        (new LeadController())->importCsv();
        break;

    case 'leads/sample-csv':
        require_once __DIR__ . '/../controllers/LeadController.php';
        (new LeadController())->sampleCsv();
        break;

    // --- CREATE LEAD / APPOINTMENTS ---
    case 'create-lead':
    case 'appointments':
        require_once __DIR__ . '/../controllers/AppointmentController.php';
        $controller = new AppointmentController();
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $controller->store();
        } else {
            $controller->index();
        }
        break;

    case 'create-lead/status':
    case 'appointments/status':
        require_once __DIR__ . '/../controllers/AppointmentController.php';
        (new AppointmentController())->updateStatus();
        break;

    case 'create-lead/export-csv':
    case 'appointments/export-csv':
        require_once __DIR__ . '/../controllers/AppointmentController.php';
        (new AppointmentController())->exportCsv();
        break;

    case 'create-lead/import-csv':
    case 'appointments/import-csv':
        require_once __DIR__ . '/../controllers/AppointmentController.php';
        (new AppointmentController())->importCsv();
        break;

    case 'create-lead/sample-csv':
    case 'appointments/sample-csv':
        require_once __DIR__ . '/../controllers/AppointmentController.php';
        (new AppointmentController())->sampleCsv();
        break;

    // --- SETTINGS ---
    case 'settings':
        require_once __DIR__ . '/../controllers/SettingController.php';
        $controller = new SettingController();
        if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
            $controller->updateSettings();
        } else {
            $controller->getSettings();
        }
        break;

    // --- USERS ---
    case 'users':
        require_once __DIR__ . '/../controllers/UserController.php';
        $controller = new UserController();
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $controller->store();
        } else {
            $controller->index();
        }
        break;

    case 'users/delete':
        require_once __DIR__ . '/../controllers/UserController.php';
        (new UserController())->delete();
        break;

    case 'users/status':
        require_once __DIR__ . '/../controllers/UserController.php';
        (new UserController())->toggleStatus();
        break;

    // --- REPORTS ---
    case 'reports/profit-loss':
        require_once __DIR__ . '/../controllers/ReportController.php';
        (new ReportController())->profitLoss();
        break;

    case 'reports/total-profit-loss':
        require_once __DIR__ . '/../controllers/ReportController.php';
        (new ReportController())->totalProfitLoss();
        break;

    case 'reports/emi-status':
        require_once __DIR__ . '/../controllers/ReportController.php';
        (new ReportController())->emiStatus();
        break;

    case 'reports/entry':
        require_once __DIR__ . '/../controllers/ReportController.php';
        (new ReportController())->storeEntry();
        break;

    case 'migrate':
    case 'init':
        require_once __DIR__ . '/../config/Database.php';
        require_once __DIR__ . '/../config/Schema.php';
        $db = Database::getInstance()->getConnection();
        Schema::ensure($db, true);
        Response::json(true, 'Database schema and default admin initialized successfully');
        break;

    default:
        Response::error("API Endpoint '{$route}' not found", 404);
        break;
}
