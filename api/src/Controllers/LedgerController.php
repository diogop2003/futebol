<?php
declare(strict_types=1);
namespace Pelada\Controllers;
use Pelada\Core\{Database, Http};
use Pelada\Domain\Validate;
use Pelada\Repositories\LedgerRepository;
use Pelada\Services\{LedgerService, FinanceService};

final class LedgerController
{
    public function read(string $resource): never
    {
        [$start, $end] = Validate::period($_GET);
        $repo = new LedgerRepository(Database::connect());
        $result = match ($resource) {
            'events' => $repo->events(Validate::kind($_GET['kind'] ?? null), $start, $end),
            'expenses' => $repo->expenses($start, $end),
            'finance' => (new FinanceService($repo->db))->summary($start, $end),
        };
        Http::respond(['data' => $result]);
    }

    public function write(string $resource, string $method, ?int $id, int $userId): never
    {
        $data = Http::body();
        $service = new LedgerService(new LedgerRepository(Database::connect()));
        if ($method === 'DELETE') {
            $service->delete($resource === 'events' ? 'event' : 'expense', $id, Validate::integer($data['version'] ?? null, 'Versão', 1, PHP_INT_MAX), $userId);
            Http::respond(['message' => 'Registro excluído.']);
        }
        $saved = $resource === 'events' ? $service->saveEvent($data, $userId, $id) : $service->saveExpense($data, $userId, $id);
        Http::respond(['id' => $saved, 'message' => 'Alterações salvas.'], $method === 'POST' ? 201 : 200);
    }
}
