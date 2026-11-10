<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';

use Pelada\Core\Database;
use Pelada\Services\FinanceService;

// Read-only against the source. Creates/restores/drops ONLY its own random test database.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$backup = $argv[1] ?? '';
if (!is_file($backup)) { throw new RuntimeException('Informe o backup SQL local a conferir.'); }
$sql = file_get_contents($backup);
if (preg_match('/^\s*(?:USE\b|CREATE\s+DATABASE\b|DROP\s+(?:DATABASE|TABLE)\b)/mi', $sql)) {
    throw new RuntimeException('Backup fora do formato esperado: contém comandos de troca ou exclusão de banco/tabelas.');
}
$source = Database::connect();
$tables = $source->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
$snapshot = [];
function tableSnapshot(PDO $db, string $table): array
{
    if (!preg_match('/^[a-z_]+$/', $table)) { throw new RuntimeException('Tabela fora do formato esperado.'); }
    $keys = $db->query("SHOW KEYS FROM `$table` WHERE Key_name='PRIMARY'")->fetchAll();
    usort($keys, static fn($a, $b) => $a['Seq_in_index'] <=> $b['Seq_in_index']);
    $order = implode(',', array_map(static fn($row) => '`' . $row['Column_name'] . '`', $keys));
    if ($order === '') { throw new RuntimeException('Tabela sem chave primária.'); }
    $rows = $db->query("SELECT * FROM `$table` ORDER BY $order")->fetchAll();
    return ['count' => count($rows), 'hash' => hash('sha256', json_encode($rows, JSON_THROW_ON_ERROR))];
}
foreach ($tables as $table) { $snapshot[$table] = tableSnapshot($source, $table); }
$expectedFinance = (new FinanceService($source))->summary('2026-10-01', '2026-11-01');
$name = 'pelada_test_' . bin2hex(random_bytes(6));
$host = getenv('TEST_DB_HOST') ?: '127.0.0.1'; $port = getenv('TEST_DB_PORT') ?: '3307';
$user = getenv('TEST_DB_USER') ?: 'root'; $password = getenv('TEST_DB_PASSWORD') ?: '';
$restore = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false, PDO::ATTR_STRINGIFY_FETCHES => false]);
$restore->exec("CREATE DATABASE `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
try {
    $restore->exec("USE `$name`");
    $restore->exec("SET time_zone='-03:00'");
    $restore->exec($sql);
    $actualTables = $restore->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    if ($tables !== $actualTables) { throw new RuntimeException('A restauração não preservou todas as tabelas.'); }
    foreach ($snapshot as $table => $expected) {
        if (tableSnapshot($restore, $table) !== $expected) { throw new RuntimeException("Divergência nos dados da tabela $table. Verifique se o banco local recebeu alterações durante a exportação."); }
    }
    if ((new FinanceService($restore))->summary('2026-10-01', '2026-11-01') !== $expectedFinance) { throw new RuntimeException('O financeiro não foi preservado na restauração.'); }
    echo count($tables) . " tabelas restauradas e conferidas integralmente, incluindo usuários, hashes de senha, lançamentos e saldo.\n";
} finally {
    $restore->exec("DROP DATABASE `$name`");
    echo "Somente o banco temporário de verificação foi removido.\n";
}
