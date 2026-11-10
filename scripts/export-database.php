<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/api/bootstrap.php';

use Pelada\Core\{Database, Env};

$options = getopt('', ['output:', 'dump-bin:']);
$output = $options['output'] ?? '';
try {
    if (!is_string($output) || $output === '') { throw new RuntimeException('Informe --output=caminho/banco.sql em uma pasta privada.'); }
    if (!is_dir(dirname($output)) || file_exists($output)) { throw new RuntimeException('A pasta de destino deve existir e o arquivo de backup deve ser novo.'); }
    // Check access without printing any environment values or credentials.
    $db = Database::connect();
    $tables = $db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    if (!$tables) { throw new RuntimeException('O banco não contém tabelas para exportar.'); }
    $portable = dirname(__DIR__) . '/.tools/mariadb/mariadb-11.4.5-winx64/bin/mariadb-dump.exe';
    $binary = $options['dump-bin'] ?? (is_file($portable) ? $portable : 'mariadb-dump');
    $args = [$binary, '--host=' . Env::get('DB_HOST', '127.0.0.1'), '--port=' . Env::get('DB_PORT', '3306'),
        '--user=' . Env::get('DB_USERNAME', 'pelada'), '--single-transaction', '--quick', '--skip-lock-tables',
        '--skip-add-locks', '--skip-add-drop-table', '--no-tablespaces', '--hex-blob', '--default-character-set=utf8mb4',
        '--result-file=' . $output, '--', Env::get('DB_DATABASE', 'pelada')];
    $environment = getenv();
    $environment['MYSQL_PWD'] = Env::get('DB_PASSWORD');
    $process = proc_open($args, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, null, $environment, ['bypass_shell' => true]);
    unset($environment['MYSQL_PWD']);
    if (!is_resource($process)) { throw new RuntimeException('Não foi possível executar mariadb-dump.'); }
    fclose($pipes[0]);
    stream_get_contents($pipes[1]); fclose($pipes[1]);
    $error = stream_get_contents($pipes[2]); fclose($pipes[2]);
    $exit = proc_close($process);
    if ($exit !== 0 || !is_file($output) || filesize($output) === 0) {
        throw new RuntimeException('A exportação falhou. Confira a conexão, as permissões e o executável mariadb-dump. Um arquivo parcial não deve ser importado.');
    }
    @chmod($output, 0600);
    echo json_encode(['file' => realpath($output), 'tables' => count($tables), 'bytes' => filesize($output), 'sha256' => hash_file('sha256', $output)], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . "\n";
} catch (Throwable $e) {
    fwrite(STDERR, $e instanceof PDOException ? "Não foi possível acessar o banco local. Confira se o MariaDB está ativo e se api/.env está configurado.\n" : $e->getMessage() . "\n");
    exit(1);
}
