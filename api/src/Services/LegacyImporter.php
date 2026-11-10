<?php
declare(strict_types=1);
namespace Pelada\Services;
use PDO;
use Pelada\Core\ApiException;
use Pelada\Repositories\LedgerRepository;

final class LegacyImporter
{
    public function __construct(private readonly PDO $db) {}

    public function run(array $manifest, int $userId, bool $apply): array
    {
        if (($manifest['version'] ?? null) !== 1 || !isset($manifest['sources'], $manifest['events'], $manifest['expenses'])) { throw new ApiException(422, 'Manifesto inválido.'); }
        foreach ($manifest['sources'] as $file => $checksum) {
            if (!in_array($file, ['mensalistas.html','diaristas.html','churrasco.html','saldo.html'], true)) { throw new ApiException(422, 'Arquivo de origem não reconhecido.'); }
            $path = dirname(__DIR__, 3) . '/legacy/original/' . $file;
            if (!is_file($path) || !hash_equals(hash_file('sha256', $path), $checksum)) { throw new ApiException(422, 'O arquivo histórico foi alterado: ' . $file); }
        }
        $repo = new LedgerRepository($this->db); $service = new LedgerService($repo);
        $result = ['mode' => $apply ? 'apply' : 'dry-run', 'created' => 0, 'skipped' => 0, 'events' => 0, 'expenses' => 0];
        $this->db->beginTransaction();
        try {
            foreach (['events', 'expenses'] as $type) {
                foreach ($manifest[$type] as $item) {
                    if (($item['approved'] ?? false) !== true || (!empty($item['warnings']) && empty($item['reviewNote']))) { throw new ApiException(422, 'Revisão necessária: ' . ($item['sourceKey'] ?? 'sem origem')); }
                    $sourceKey = $item['sourceKey'] ?? '';
                    $sourceHash = $item['sourceHash'] ?? '';
                    if (!is_string($sourceKey) || !preg_match('/^[a-z0-9:-]{1,100}$/', $sourceKey) || !preg_match('/^[a-f0-9]{64}$/', $sourceHash)) { throw new ApiException(422, 'Identificador histórico inválido.'); }
                    $stmt = $this->db->prepare('SELECT source_hash FROM legacy_imports WHERE source_key=? FOR UPDATE'); $stmt->execute([$sourceKey]); $existing = $stmt->fetchColumn();
                    if ($existing !== false) {
                        if (!hash_equals($existing, $sourceHash)) { throw new ApiException(409, 'Origem já importada com conteúdo diferente: ' . $sourceKey); }
                        $result['skipped']++; continue;
                    }
                    $data = $item['data'];
                    $hex = hash('sha256', 'pelada-legacy:' . $sourceKey);
                    $data['requestKey'] = substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20, 12);
                    $id = $type === 'events' ? $service->saveEvent($data, $userId, null, true) : $service->saveExpense($data, $userId, null, true);
                    $this->db->prepare('INSERT INTO legacy_imports(source_key,source_hash,event_id,expense_id) VALUES(?,?,?,?)')->execute([$sourceKey, $sourceHash, $type === 'events' ? $id : null, $type === 'expenses' ? $id : null]);
                    $result['created']++; $result[$type]++;
                }
            }
            if ($apply) { $this->db->commit(); } else { $this->db->rollBack(); }
            return $result;
        } catch (\Throwable $e) { if ($this->db->inTransaction()) { $this->db->rollBack(); } throw $e; }
    }
}
