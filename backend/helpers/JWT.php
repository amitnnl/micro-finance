<?php
/**
 * JWT Helper for Pure PHP Authentication Tokens
 */
class JWT {
    private static $secretKey = "MicroFinance_SecretKey_JWT_2026_SecureKey!";

    private static function getSecret(): string {
        return getenv('JWT_SECRET') ?: self::$secretKey;
    }

    public static function generate(array $payload, int $expirySeconds = 2592000): string {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['iat'] = time();
        $payload['exp'] = time() + $expirySeconds;

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecret(), true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function verify(string $jwt) {
        $tokenParts = explode('.', $jwt);
        if (count($tokenParts) !== 3) return false;

        $signature = hash_hmac('sha256', $tokenParts[0] . "." . $tokenParts[1], self::getSecret(), true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        if (!hash_equals($base64UrlSignature, $tokenParts[2])) return false;

        $payloadRaw = str_replace(['-', '_'], ['+', '/'], $tokenParts[1]);
        $pad = strlen($payloadRaw) % 4;
        if ($pad) {
            $payloadRaw .= str_repeat('=', 4 - $pad);
        }
        $data = json_decode(base64_decode($payloadRaw), true);
        if (!is_array($data)) return false;
        if (isset($data['exp']) && $data['exp'] < time()) return false;

        return $data;
    }

    public static function getBearerToken() {
        $headers = null;
        if (!empty($_SERVER['Authorization'])) {
            $headers = trim($_SERVER["Authorization"]);
        } else if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        } else if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $headers = trim($_SERVER["REDIRECT_HTTP_AUTHORIZATION"]);
        } else if (!empty($_SERVER['HTTP_X_AUTHORIZATION'])) {
            $headers = trim($_SERVER["HTTP_X_AUTHORIZATION"]);
        } else if (!empty($_SERVER['REDIRECT_HTTP_X_AUTHORIZATION'])) {
            $headers = trim($_SERVER["REDIRECT_HTTP_X_AUTHORIZATION"]);
        } else if (function_exists('getallheaders')) {
            $requestHeaders = getallheaders();
            if (is_array($requestHeaders)) {
                foreach ($requestHeaders as $k => $v) {
                    if (strcasecmp($k, 'Authorization') === 0 || strcasecmp($k, 'X-Authorization') === 0) {
                        $headers = trim($v);
                        break;
                    }
                }
            }
        } else if (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            if (is_array($requestHeaders)) {
                foreach ($requestHeaders as $k => $v) {
                    if (strcasecmp($k, 'Authorization') === 0 || strcasecmp($k, 'X-Authorization') === 0) {
                        $headers = trim($v);
                        break;
                    }
                }
            }
        }

        if (!empty($headers)) {
            if (preg_match('/Bearer\s+(\S+)/i', $headers, $matches)) {
                return $matches[1];
            }
            // In case token was sent without Bearer prefix
            if (substr_count($headers, '.') === 2) {
                return $headers;
            }
        }

        // Fallback 1: Check GET query parameter
        if (!empty($_GET['token'])) {
            return trim($_GET['token']);
        }
        if (!empty($_GET['auth_token'])) {
            return trim($_GET['auth_token']);
        }

        // Fallback 2: Check POST form parameter
        if (!empty($_POST['token'])) {
            return trim($_POST['token']);
        }
        if (!empty($_POST['auth_token'])) {
            return trim($_POST['auth_token']);
        }

        // Fallback 3: Check JSON body token
        $raw = file_get_contents('php://input');
        if (!empty($raw) && (strpos($raw, '{') === 0 || strpos($raw, '[') === 0)) {
            $parsed = @json_decode($raw, true);
            if (!empty($parsed['token'])) {
                return trim($parsed['token']);
            }
        }

        return null;
    }
}
