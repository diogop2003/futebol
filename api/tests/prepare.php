<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
use Pelada\Core\{Database, Migrator};

// Creates ONLY a new random test database. It never targets the application's DB_DATABASE.
$data = json_decode(stream_get_contents(STDIN), true, 16, JSON_THROW_ON_ERROR);
$name = $data['database'] ?? '';
if (!preg_match('/^pelada_test_[a-f0-9]{12}$/', $name)) { throw new RuntimeException('Unsafe test database name.'); }
$host = getenv('TEST_DB_HOST') ?: '127.0.0.1'; $port = getenv('TEST_DB_PORT') ?: '3307';
$user = getenv('TEST_DB_USER') ?: 'root'; $password = getenv('TEST_DB_PASSWORD') ?: '';
$db = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$db->exec("CREATE DATABASE `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
putenv("DB_HOST=$host"); putenv("DB_PORT=$port"); putenv("DB_USERNAME=$user"); putenv("DB_PASSWORD=$password"); putenv("DB_DATABASE=$name");
$app = Database::connect(); Migrator::run($app);
echo "Banco de testes criado.\n";
