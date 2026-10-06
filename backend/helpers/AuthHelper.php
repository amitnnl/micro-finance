<?php
/**
 * Role-Based Access Control (RBAC) & Authentication Helper
 * Provides strict authorization gates for Admin, Manager, and Staff roles.
 */

require_once __DIR__ . '/JWT.php';
require_once __DIR__ . '/Response.php';

class AuthHelper {
    /**
     * Decode and verify JWT token from Authorization header or query parameter
     */
    public static function getUser(): ?array {
        $token = JWT::getBearerToken();
        if (!$token) {
            return null;
        }

        $userData = JWT::verify($token);
        return is_array($userData) ? $userData : null;
    }

    /**
     * Require that a valid user is logged in
     */
    public static function requireAuth(): array {
        $user = self::getUser();
        if (!$user) {
            Response::error('Authentication required. Your session may have expired.', 401);
            exit();
        }
        return $user;
    }

    /**
     * Normalize role strings across variations (e.g. 'Branch Manager' => 'manager')
     */
    public static function normalizeRole(?string $role): string {
        $r = strtolower(trim((string)$role));
        if ($r === 'branch manager' || strpos($r, 'manager') !== false) {
            return 'manager';
        }
        if ($r === 'admin' || $r === 'system admin' || $r === 'administrator' || strpos($r, 'admin') !== false) {
            return 'admin';
        }
        return 'staff';
    }

    /**
     * Guard endpoint by requiring one of the allowed roles
     */
    public static function requireRole(array $allowedRoles): array {
        $user = self::requireAuth();
        $userRole = self::normalizeRole($user['role'] ?? 'staff');

        $normalizedAllowed = array_map([self::class, 'normalizeRole'], $allowedRoles);

        if (!in_array($userRole, $normalizedAllowed, true)) {
            $formattedAllowed = implode(', ', array_map('ucfirst', $allowedRoles));
            Response::error("Access denied. This action requires [{$formattedAllowed}] privileges.", 403);
            exit();
        }

        return $user;
    }
}
