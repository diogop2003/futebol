<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/bootstrap.php';

use Pelada\Core\{Database, Migrator};
use Pelada\Domain\{Money, Validate};
use Pelada\Services\LegacyImporter;

$command = $argv[1] ?? 'help';
$options = [];
foreach (array_slice($argv, 2) as $arg) {
    if (preg_match('/^--([a-z-]+)=(.*)$/s', $arg, $m)) { $options[$m[1]] = $m[2]; }
}
try {
    if ($command === 'help') {
        echo "migrate\ncreate-admin --name=Nome --email=email (senha via stdin)\nfinance-init --date=2026-10-01 --balance=1985.48 --email=admin --description=origem\nimport-legacy --file=caminho --email=admin [--apply=yes]\n";
        exit;
    }
    $db = Database::connect();
    if ($command === 'migrate') {
        echo json_encode(['applied' => Migrator::run($db)], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . "\n";
    } elseif ($command === 'create-admin') {
        $name = Validate::text($options['name'] ?? null, 'Nome');
        $email = strtolower(trim($options['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) { throw new RuntimeException('E-mail inválido.'); }
        if (function_exists('stream_isatty') && stream_isatty(STDIN)) { throw new RuntimeException('Forneça a senha por stdin usando um prompt oculto do shell. Consulte README.md.'); }
        $password = rtrim(stream_get_contents(STDIN, 2049), "\r\n");
        if (strlen($password) < 12 || strlen($password) > 72) { throw new RuntimeException('Use uma senha de 12 a 72 bytes.'); }
        // Serializes bootstrap administrators and prevents duplicate account races.
        if ((int) $db->query("SELECT GET_LOCK('pelada_create_admin',10)")->fetchColumn() !== 1) { throw new RuntimeException('Outro cadastro em andamento.'); }
        try {
            if ((int) $db->query("SELECT COUNT(*) FROM users WHERE role='admin'")->fetchColumn() > 0) { throw new RuntimeException('O primeiro administrador já existe. Nenhuma conta foi alterada.'); }
            $stmt = $db->prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'admin')");
            $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
            echo "Primeiro administrador criado.\n";
        } finally { $db->query("SELECT RELEASE_LOCK('pelada_create_admin')"); unset($password); }
    } elseif (in_array($command, ['finance-init', 'import-legacy'], true)) {
        $stmt = $db->prepare("SELECT id FROM users WHERE email=? AND role='admin' AND active=1"); $stmt->execute([strtolower($options['email'] ?? '')]);
        $userId = (int) $stmt->fetchColumn();
        if (!$userId) { throw new RuntimeException('Informe o e-mail de um administrador ativo.'); }
        if ($command === 'finance-init') {
            $date = Validate::date($options['date'] ?? null);
            if (substr($date, 8) !== '01') { throw new RuntimeException('Informe o primeiro dia do mês.'); }
            $balance = Money::decimal(Money::cents($options['balance'] ?? null, true));
            $description = Validate::text($options['description'] ?? null, 'Origem do saldo', 1000);
            $db->prepare("INSERT INTO financial_config(id,basis,opening_date,opening_balance,description,created_by) VALUES(1,'reference',?,?,?,?)")->execute([$date, $balance, $description, $userId]);
            echo "Saldo inicial configurado. Configurações existentes nunca são sobrescritas.\n";
        } else {
            $path = $options['file'] ?? '';
            if (!is_file($path)) { throw new RuntimeException('Arquivo de importação não encontrado.'); }
            $manifest = json_decode(file_get_contents($path), true, 64, JSON_THROW_ON_ERROR);
            $result = (new LegacyImporter($db))->run($manifest, $userId, ($options['apply'] ?? '') === 'yes');
            echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . "\n";
        }
    } else { throw new RuntimeException('Comando desconhecido. Use help.'); }
} catch (Throwable $e) {
    // CLI errors are operational; never print connection credentials or password input.
    fwrite(STDERR, $e instanceof PDOException ? "Falha no banco (SQLSTATE {$e->getCode()}). Confira conexão, migrations ou duplicidades.\n" : $e->getMessage() . "\n");
    exit(1);
}
