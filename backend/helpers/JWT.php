<?php
/**
 * JWT Helper for Pure PHP Authentication Tokens
 */
class JWT {
    private static $secretKey = "MicroFinance_SecretKey_JWT_2026_SecureKey!";

    private static function getSecret(): string {
        return getenv('JWT_SECRET') ?: self::$secretKey;
    }

    public static function generate(array $payload, int $expirySeconds = 86400): string {
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

        $header = base64_decode($tokenParts[0]);
        $payload = base64_decode($tokenParts[1]);
        $signatureProvided = $tokenParts[2];

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecret(), true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        if ($base64UrlSignature !== $signatureProvided) return false;

        $data = json_decode($payload, true);
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

        // Fallback: Check GET/POST token parameter (for download links or header-stripped proxies)
        if (!empty($_GET['token'])) {
            return trim($_GET['token']);
        }
        if (!empty($_POST['token'])) {
            return trim($_POST['token']);
        }

        return null;
    }
}
