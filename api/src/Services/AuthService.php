<?php
declare(strict_types=1);
namespace Pelada\Services;
use PDO;
use Pelada\Core\{ApiException, Database, Env};

final class AuthService
{
    public static function start(): void
    {
        $secure = Env::get('SESSION_SECURE', 'true') === 'true';
        if (Env::get('APP_ENV', 'production') === 'production' && !$secure) {
            throw new \RuntimeException('Production requires secure session cookies.');
        }
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        session_name('pelada_session');
        session_set_cookie_params(['lifetime' => 0, 'path' => '/api', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
        session_start();
        $now = time();
        if (isset($_SESSION['user_id']) && ($now - ($_SESSION['last_seen'] ?? 0) > (int) Env::get('SESSION_IDLE_SECONDS', '1800') || $now - ($_SESSION['created'] ?? 0) > (int) Env::get('SESSION_MAX_SECONDS', '28800'))) {
            $_SESSION = [];
            session_regenerate_id(true);
        }
        $_SESSION['last_seen'] = $now;
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    }

    public function user(): ?array
    {
        if (!isset($_SESSION['user_id'])) { return null; }
        $stmt = Database::connect()->prepare('SELECT id,name,email,role FROM users WHERE id=? AND active=1');
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        if (!$user) { unset($_SESSION['user_id']); return null; }
        $user['id'] = (int) $user['id'];
        return $user;
    }

    public function requireWriter(): array
    {
        $user = $this->user();
        if (!$user) { throw new ApiException(401, 'Entre com uma conta autorizada.'); }
        if (!in_array($user['role'], ['admin', 'manager'], true)) { throw new ApiException(403, 'Acesso não autorizado.'); }
        return $user;
    }

    public function csrf(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '' && $origin !== rtrim(Env::get('APP_ORIGIN'), '/')) { throw new ApiException(403, 'Origem da requisição não autorizada.'); }
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($token) || !hash_equals($_SESSION['csrf'], $token)) { throw new ApiException(403, 'Sessão de segurança inválida. Atualize a página e tente novamente.'); }
    }

    public function session(): array
    {
        return ['user' => $this->user(), 'csrfToken' => $_SESSION['csrf']];
    }

    public function login(array $input): array
    {
        $email = strtolower(trim(is_string($input['email'] ?? null) ? $input['email'] : ''));
        $password = $input['password'] ?? '';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190 || !is_string($password) || strlen($password) > 1024) {
            throw new ApiException(401, 'E-mail ou senha inválidos.');
        }
        $db = Database::connect();
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown'; // Never trust arbitrary X-Forwarded-For headers.
        $buckets = [hash('sha256', 'account:' . $ip . ':' . $email) => 5, hash('sha256', 'ip:' . $ip) => 30];
        $db->beginTransaction();
        try {
            $db->exec('DELETE FROM login_attempts WHERE window_start < DATE_SUB(NOW(), INTERVAL 1 DAY)');
            foreach ($buckets as $bucket => $limit) {
                $stmt = $db->prepare('INSERT IGNORE INTO login_attempts(bucket,attempts,window_start) VALUES(?,0,NOW())');
                $stmt->execute([$bucket]);
                $stmt = $db->prepare('SELECT attempts,window_start FROM login_attempts WHERE bucket=? FOR UPDATE');
                $stmt->execute([$bucket]);
                $attempt = $stmt->fetch();
                if (strtotime($attempt['window_start']) < time() - 900) {
                    $db->prepare('UPDATE login_attempts SET attempts=0,window_start=NOW() WHERE bucket=?')->execute([$bucket]);
                    $attempt['attempts'] = 0;
                }
                if ((int) $attempt['attempts'] >= $limit) { throw new ApiException(429, 'Muitas tentativas. Tente novamente em 15 minutos.'); }
                $db->prepare('UPDATE login_attempts SET attempts=attempts+1 WHERE bucket=?')->execute([$bucket]);
            }
            $db->commit();
        } catch (\Throwable $e) { if ($db->inTransaction()) { $db->rollBack(); } throw $e; }
        $stmt = $db->prepare('SELECT * FROM users WHERE email=? AND active=1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        // Fixed dummy hash equalizes expensive password verification for unknown accounts.
        $hash = $user['password_hash'] ?? '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        if (!password_verify($password, $hash) || !$user) { throw new ApiException(401, 'E-mail ou senha inválidos.'); }
        if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
            $db->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        }
        $db->prepare('DELETE FROM login_attempts WHERE bucket=?')->execute([array_key_first($buckets)]);
        session_regenerate_id(true);
        $_SESSION = ['user_id' => (int) $user['id'], 'csrf' => bin2hex(random_bytes(32)), 'created' => time(), 'last_seen' => time()];
        return $this->session();
    }

    public function logout(): array
    {
        $_SESSION = [];
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        return $this->session();
    }
}
