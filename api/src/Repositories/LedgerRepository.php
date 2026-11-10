<?php
declare(strict_types=1);
namespace Pelada\Repositories;
use PDO;
use Pelada\Core\ApiException;
use Pelada\Domain\{Money, Validate};

final class LedgerRepository
{
    public function __construct(public readonly PDO $db) {}

    public function events(string $kind, string $start, string $end): array
    {
        $stmt = $this->db->prepare('SELECT id,kind,reference_date,title,amount,version FROM events WHERE kind=? AND reference_date>=? AND reference_date<? AND deleted_at IS NULL ORDER BY reference_date,id');
        $stmt->execute([$kind, $start, $end]);
        $events = $stmt->fetchAll();
        if (!$events) { return []; }
        $ids = array_column($events, 'id');
        $stmt = $this->db->prepare('SELECT ep.event_id,ep.person_id,p.name,ep.amount,ep.paid,ep.paid_at FROM event_participants ep JOIN people p ON p.id=ep.person_id WHERE ep.event_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ') ORDER BY p.name,p.id');
        $stmt->execute($ids);
        $participants = [];
        foreach ($stmt->fetchAll() as $row) {
            $participants[$row['event_id']][] = ['personId' => (int) $row['person_id'], 'name' => $row['name'], 'amount' => $row['amount'], 'paid' => (bool) $row['paid'], 'paidAt' => $row['paid_at']];
        }
        return array_map(function ($event) use ($participants) {
            $people = $participants[$event['id']] ?? [];
            $expected = $received = 0;
            foreach ($people as $person) {
                $value = Money::cents($person['amount']); $expected += $value;
                if ($person['paid']) { $received += $value; }
            }
            return ['id' => (int) $event['id'], 'kind' => $event['kind'], 'date' => $event['reference_date'], 'title' => $event['title'], 'amount' => $event['amount'], 'version' => (int) $event['version'], 'participants' => $people,
                'totals' => ['count' => count($people), 'expected' => Money::decimal($expected), 'received' => Money::decimal($received), 'pending' => Money::decimal($expected - $received)]];
        }, $events);
    }

    public function event(int $id): array
    {
        $stmt = $this->db->prepare('SELECT * FROM events WHERE id=? AND deleted_at IS NULL');
        $stmt->execute([$id]); $row = $stmt->fetch();
        if (!$row) { throw new ApiException(404, 'Cobrança não encontrada.'); }
        return $row;
    }

    public function expenses(string $start, string $end): array
    {
        $stmt = $this->db->prepare('SELECT id,expense_date AS date,reference_date AS referenceDate,amount,category,description,version FROM expenses WHERE reference_date>=? AND reference_date<? AND deleted_at IS NULL ORDER BY expense_date,id');
        $stmt->execute([$start, $end]);
        return array_map(static function ($row) { $row['id'] = (int) $row['id']; $row['version'] = (int) $row['version']; return $row; }, $stmt->fetchAll());
    }

    public function people(string $search = ''): array
    {
        // Search is bounded and explicit; no public directory endpoint.
        $stmt = $this->db->prepare("SELECT id,name FROM people WHERE name LIKE ? ESCAPE '!' ORDER BY name LIMIT 100");
        $stmt->execute(['%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search) . '%']);
        return array_map(static fn($row) => ['id' => (int) $row['id'], 'name' => $row['name']], $stmt->fetchAll());
    }

    public function resolvePerson(array $person): int
    {
        if (isset($person['personId'])) {
            $id = Validate::integer($person['personId'], 'Participante', 1, PHP_INT_MAX);
            $stmt = $this->db->prepare('SELECT id FROM people WHERE id=?'); $stmt->execute([$id]);
            if (!$stmt->fetch()) { throw new ApiException(422, 'Participante inexistente.'); }
            return $id;
        }
        $name = Validate::text($person['name'] ?? null, 'Nome');
        $key = Validate::nameKey($name);
        $this->db->prepare('INSERT INTO people(name,name_key) VALUES(?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)')->execute([$name, $key]);
        return (int) $this->db->lastInsertId();
    }

    public function audit(int $userId, string $action, string $entity, int $id, mixed $before, mixed $after): void
    {
        $stmt = $this->db->prepare('INSERT INTO audit_logs(user_id,action,entity,entity_id,before_data,after_data) VALUES(?,?,?,?,?,?)');
        $stmt->execute([$userId, $action, $entity, $id, $before === null ? null : json_encode($before, JSON_THROW_ON_ERROR), $after === null ? null : json_encode($after, JSON_THROW_ON_ERROR)]);
    }
}
