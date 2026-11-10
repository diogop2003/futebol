<?php
declare(strict_types=1);
$name = $argv[1] ?? '';
if (PHP_SAPI !== 'cli' || !preg_match('/^pelada_test_[a-f0-9]{12}$/', $name)) { throw new RuntimeException('Unsafe test database name.'); }
$host = getenv('TEST_DB_HOST') ?: '127.0.0.1'; $port = getenv('TEST_DB_PORT') ?: '3307';
$db = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", getenv('TEST_DB_USER') ?: 'root', getenv('TEST_DB_PASSWORD') ?: '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$db->exec("DROP DATABASE `$name`");
echo "Banco temporário removido.\n";
