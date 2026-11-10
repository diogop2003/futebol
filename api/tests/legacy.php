<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
use Pelada\Core\{ApiException, Database, Migrator};
use Pelada\Services\{FinanceService, LegacyImporter};

// Invoked only with the disposable database prepared by scripts/test-api.mjs.
if (!preg_match('/^pelada_test_[a-f0-9]{12}$/', getenv('DB_DATABASE') ?: '')) { throw new RuntimeException('Use um banco de testes isolado.'); }
$db = Database::connect();
if (Migrator::run($db) !== []) { throw new RuntimeException('Migrations não são idempotentes.'); }
$db->exec('UPDATE events SET deleted_at=NOW() WHERE deleted_at IS NULL');
$db->exec('UPDATE expenses SET deleted_at=NOW() WHERE deleted_at IS NULL');
$manifest = json_decode(file_get_contents(dirname(__DIR__, 2) . '/legacy/extracted.json'), true, 64, JSON_THROW_ON_ERROR);
$importer = new LegacyImporter($db);
$before = (int) $db->query('SELECT COUNT(*) FROM events')->fetchColumn();
try { $importer->run($manifest, 1, true); throw new RuntimeException('Importação ambígua não foi bloqueada.'); }
catch (ApiException $e) { if ($e->status !== 422) { throw $e; } }
if ((int) $db->query('SELECT COUNT(*) FROM events')->fetchColumn() !== $before) { throw new RuntimeException('Lote inconsistente deixou gravações parciais.'); }
$manifest['events'] = array_values(array_filter($manifest['events'], static fn($item) => $item['approved'] === true));
$dryRun = $importer->run($manifest, 1, false);
if ((int) $db->query('SELECT COUNT(*) FROM events')->fetchColumn() !== $before) { throw new RuntimeException('Simulação alterou os dados.'); }
$result = $importer->run($manifest, 1, true);
if ($result['events'] !== count($manifest['events']) || $result['expenses'] !== 4) { throw new RuntimeException('Contagem histórica divergente.'); }
$replay = $importer->run($manifest, 1, true);
if ($replay['created'] !== 0 || $replay['skipped'] !== count($manifest['events']) + 4) { throw new RuntimeException('Importação duplicou dados.'); }
// Seeded CRUD fixtures use different titles in October; financial history is checked separately.
$db->exec("UPDATE events SET deleted_at=NOW() WHERE id NOT IN (SELECT event_id FROM legacy_imports WHERE event_id IS NOT NULL)");
$db->exec("UPDATE expenses SET deleted_at=NOW() WHERE id NOT IN (SELECT expense_id FROM legacy_imports WHERE expense_id IS NOT NULL)");
$summary = (new FinanceService($db))->summary('2026-10-01', '2026-11-01');
foreach (['expected'=>'3260.00','received'=>'3230.00','pending'=>'30.00','expenses'=>'3449.83','balance'=>'-219.83','previousBalance'=>'1985.48','accumulatedBalance'=>'1765.65'] as $field => $value) {
    if ($summary[$field] !== $value) { throw new RuntimeException("Conferência de outubro falhou: $field = {$summary[$field]} (esperado $value)"); }
}
echo "Importação verificada: {$result['events']} eventos e 4 gastos, rollback de inconsistências, simulação sem escrita, reexecução sem duplicidades; saldo de outubro R$ 1.765,65.\n";
