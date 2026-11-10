<?php
declare(strict_types=1);
// Optional local development bootstrap; never changes an existing database or .env.
require dirname(__DIR__) . '/api/bootstrap.php';
use Pelada\Core\{Database, Env, Migrator};
use Pelada\Services\LegacyImporter;

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$envFile = dirname(__DIR__) . '/api/.env';
if (is_file($envFile)) { fwrite(STDERR, "api/.env já existe; nenhuma configuração foi alterada.\n"); exit(1); }
$host = Env::get('LOCAL_DB_HOST', '127.0.0.1'); $port = Env::get('LOCAL_DB_PORT', '3307');
$rootUser = Env::get('LOCAL_DB_USER', 'root'); $rootPassword = Env::get('LOCAL_DB_PASSWORD');
try {
    $rootDb = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $rootUser, $rootPassword, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $password = bin2hex(random_bytes(32));
    // Resume is opt-in and only possible before any real record or administrator exists.
    $resume = in_array('--resume-empty', $argv, true);
    if ($resume) {
        $existing = new PDO("mysql:host=$host;port=$port;dbname=pelada_local;charset=utf8mb4", $rootUser, $rootPassword, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
        foreach (['events','expenses','financial_config','legacy_imports','audit_logs','people'] as $table) {
            if ((int)$existing->query("SELECT COUNT(*) FROM $table")->fetchColumn() !== 0) throw new RuntimeException('Retomada recusada: o banco já contém dados.');
        }
        if ((int)$existing->query("SELECT COUNT(*) FROM users WHERE active=1 OR email<>'historico@pelada.invalid'")->fetchColumn() !== 0) throw new RuntimeException('Retomada recusada: já existem usuários.');
        $rootDb->exec("ALTER USER 'pelada_local'@'127.0.0.1' IDENTIFIED BY " . $rootDb->quote($password));
    } else {
        $rootDb->exec('CREATE DATABASE pelada_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $rootDb->exec("CREATE USER 'pelada_local'@'127.0.0.1' IDENTIFIED BY " . $rootDb->quote($password));
    }
    $rootDb->exec("GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,INDEX,REFERENCES ON pelada_local.* TO 'pelada_local'@'127.0.0.1'");
    foreach (['DB_HOST'=>$host,'DB_PORT'=>$port,'DB_DATABASE'=>'pelada_local','DB_USERNAME'=>'pelada_local','DB_PASSWORD'=>$password] as $key=>$value) { putenv("$key=$value"); }
    $db = Database::connect(); Migrator::run($db);
    // Inactive attribution identity: cannot log in and is not an administrator.
    $db->prepare("INSERT INTO users(name,email,password_hash,role,active) VALUES('Importação histórica','historico@pelada.invalid',?,'manager',0) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)")->execute([password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT)]);
    $userId=(int)$db->lastInsertId();
    $manifest=json_decode(file_get_contents(dirname(__DIR__) . '/legacy/consistent.json'),true,64,JSON_THROW_ON_ERROR);
    $result=(new LegacyImporter($db))->run($manifest,$userId,true);
    $db->prepare("INSERT INTO financial_config(id,basis,opening_date,opening_balance,description,created_by) VALUES(1,'reference','2026-10-01',1985.48,'Saldo de setembro/2026 confirmado pelo responsável; acompanhamento a partir de outubro/2026',?)")->execute([$userId]);
    $content="APP_ENV=development\nAPP_ORIGIN=http://localhost:4200\nSESSION_SECURE=false\nDB_HOST=$host\nDB_PORT=$port\nDB_DATABASE=pelada_local\nDB_USERNAME=pelada_local\nDB_PASSWORD=$password\n";
    $handle=fopen($envFile,'x'); if (!$handle) throw new RuntimeException('Não foi possível criar api/.env sem sobrescrever.');
    fwrite($handle,$content); fclose($handle); @chmod($envFile,0600);
    echo "Ambiente local preparado: {$result['events']} eventos, {$result['expenses']} gastos. Nenhuma conta administrativa foi criada; use create-admin com sua própria senha.\n";
} catch (Throwable $e) { fwrite(STDERR, $e instanceof PDOException ? "Falha na inicialização local (SQLSTATE {$e->getCode()}). Nenhum banco existente foi substituído.\n" : $e->getMessage()."\n"); exit(1); }
