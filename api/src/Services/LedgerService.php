<?php
declare(strict_types=1);
namespace Pelada\Services;
use Pelada\Core\ApiException;
use Pelada\Domain\{Money, Validate};
use Pelada\Repositories\LedgerRepository;

final class LedgerService
{
    public function __construct(private readonly LedgerRepository $repo) {}

    public function saveEvent(array $data, int $userId, ?int $id = null, bool $legacy = false): int
    {
        $kind = Validate::kind($data['kind'] ?? null);
        $date = Validate::date($data['date'] ?? null);
        if ($kind === 'monthly' && substr($date, 8) !== '01') { throw new ApiException(422, 'Mensalidades usam o primeiro dia do mês de referência.'); }
        $amount = Money::decimal(Money::cents($data['amount'] ?? null));
        $title = Validate::text($data['title'] ?? '', 'Título', 160, true);
        $people = $data['participants'] ?? null;
        if (!is_array($people) || !array_is_list($people) || count($people) < 1 || count($people) > 500) { throw new ApiException(422, 'Adicione entre 1 e 500 participantes.'); }
        $db = $this->repo->db;
        $ownsTransaction = !$db->inTransaction();
        if ($ownsTransaction) { $db->beginTransaction(); }
        try {
            $before = null;
            if ($id !== null) {
                $stmt = $db->prepare('SELECT id FROM events WHERE id=? FOR UPDATE'); $stmt->execute([$id]);
                $before = $this->repo->event($id);
                $stmt = $db->prepare('SELECT * FROM event_participants WHERE event_id=?'); $stmt->execute([$id]);
                $before['participants'] = $stmt->fetchAll();
                if ($before['kind'] !== $kind) { throw new ApiException(422, 'Não é permitido alterar o módulo da cobrança.'); }
                if ((int) $before['version'] !== ($data['version'] ?? null)) { throw new ApiException(409, 'Este registro foi alterado em outra sessão. Recarregue antes de editar.'); }
                $db->prepare('UPDATE events SET reference_date=?,title=?,amount=?,version=version+1 WHERE id=?')->execute([$date, $title, $amount, $id]);
            } else {
                $key = Validate::uuid($data['requestKey'] ?? null);
                $stmt = $db->prepare('SELECT id,deleted_at FROM events WHERE request_key=?'); $stmt->execute([$key]);
                if ($existing = $stmt->fetch()) {
                    if ($existing['deleted_at']) { throw new ApiException(409, 'Esta operação já foi cancelada. Inicie um novo cadastro.'); }
                    if ($ownsTransaction) { $db->commit(); } return (int) $existing['id'];
                }
                $db->prepare('INSERT INTO events(kind,reference_date,title,amount,request_key,created_by) VALUES(?,?,?,?,?,?)')->execute([$kind, $date, $title, $amount, $key, $userId]);
                $id = (int) $db->lastInsertId();
            }
            $previous = [];
            foreach ($before['participants'] ?? [] as $row) { $previous[$row['person_id']] = $row; }
            $rows = []; $seen = [];
            foreach ($people as $person) {
                if (!is_array($person)) { throw new ApiException(422, 'Participante inválido.'); }
                $personId = $this->repo->resolvePerson($person);
                if (isset($seen[$personId])) { throw new ApiException(422, 'Um participante aparece duas vezes neste mesmo evento. Use nomes distintos para homônimos.'); }
                $seen[$personId] = true;
                if (!is_bool($person['paid'] ?? null)) { throw new ApiException(422, 'Situação do pagamento inválida.'); }
                $paid = $person['paid'];
                $paidAt = null;
                if ($paid) {
                    if (isset($person['paidAt']) && $person['paidAt'] !== '') { $paidAt = Validate::date($person['paidAt']); }
                    elseif (isset($previous[$personId]) && (bool) $previous[$personId]['paid']) { $paidAt = $previous[$personId]['paid_at']; }
                    else { $paidAt = $legacy ? null : date('Y-m-d'); }
                }
                $rows[] = [$id, $personId, Money::decimal(Money::cents($person['amount'] ?? $amount)), (int) $paid, $paidAt];
            }
            // Replace the association set atomically; the audit preserves the previous complete snapshot.
            $db->prepare('DELETE FROM event_participants WHERE event_id=?')->execute([$id]);
            $stmt = $db->prepare('INSERT INTO event_participants(event_id,person_id,amount,paid,paid_at) VALUES(?,?,?,?,?)');
            foreach ($rows as $row) { $stmt->execute($row); }
            $this->repo->audit($userId, $before ? 'update' : 'create', 'event', $id, $before, $data);
            if ($ownsTransaction) { $db->commit(); }
            return $id;
        } catch (\Throwable $e) { if ($ownsTransaction && $db->inTransaction()) { $db->rollBack(); } throw $e; }
    }

    public function saveExpense(array $data, int $userId, ?int $id = null, bool $legacy = false): int
    {
        $date = $legacy && ($data['date'] ?? null) === null ? null : Validate::date($data['date'] ?? null);
        [$reference] = Validate::period($data);
        $amount = Money::cents($data['amount'] ?? null);
        if ($amount <= 0) { throw new ApiException(422, 'O gasto deve ser maior que zero.'); }
        $category = $data['category'] ?? null;
        if (!in_array($category, Validate::CATEGORIES, true)) { throw new ApiException(422, 'Categoria de gasto inválida.'); }
        $description = Validate::text($data['description'] ?? '', 'Descrição', 1000, true);
        $db = $this->repo->db;
        $ownsTransaction = !$db->inTransaction();
        if ($ownsTransaction) { $db->beginTransaction(); }
        try {
            $before = null;
            if ($id !== null) {
                $stmt = $db->prepare('SELECT * FROM expenses WHERE id=? AND deleted_at IS NULL FOR UPDATE'); $stmt->execute([$id]); $before = $stmt->fetch();
                if (!$before) { throw new ApiException(404, 'Gasto não encontrado.'); }
                if ((int) $before['version'] !== ($data['version'] ?? null)) { throw new ApiException(409, 'Este gasto foi alterado em outra sessão. Recarregue antes de editar.'); }
                $db->prepare('UPDATE expenses SET expense_date=?,reference_date=?,amount=?,category=?,description=?,version=version+1 WHERE id=?')->execute([$date, $reference, Money::decimal($amount), $category, $description, $id]);
            } else {
                $key = Validate::uuid($data['requestKey'] ?? null);
                $stmt = $db->prepare('SELECT id,deleted_at FROM expenses WHERE request_key=?'); $stmt->execute([$key]);
                if ($existing = $stmt->fetch()) {
                    if ($existing['deleted_at']) { throw new ApiException(409, 'Esta operação já foi cancelada. Inicie um novo cadastro.'); }
                    if ($ownsTransaction) { $db->commit(); } return (int) $existing['id'];
                }
                $db->prepare('INSERT INTO expenses(expense_date,reference_date,amount,category,description,request_key,created_by) VALUES(?,?,?,?,?,?,?)')->execute([$date, $reference, Money::decimal($amount), $category, $description, $key, $userId]);
                $id = (int) $db->lastInsertId();
            }
            $this->repo->audit($userId, $before ? 'update' : 'create', 'expense', $id, $before, $data);
            if ($ownsTransaction) { $db->commit(); }
            return $id;
        } catch (\Throwable $e) { if ($ownsTransaction && $db->inTransaction()) { $db->rollBack(); } throw $e; }
    }

    public function delete(string $entity, int $id, int $version, int $userId): void
    {
        $table = $entity === 'event' ? 'events' : 'expenses';
        $db = $this->repo->db; $db->beginTransaction();
        try {
            $stmt = $db->prepare("SELECT * FROM $table WHERE id=? AND deleted_at IS NULL FOR UPDATE"); $stmt->execute([$id]); $before = $stmt->fetch();
            if (!$before) { throw new ApiException(404, 'Registro não encontrado.'); }
            if ((int) $before['version'] !== $version) { throw new ApiException(409, 'Registro alterado em outra sessão. Recarregue antes de excluir.'); }
            $db->prepare("UPDATE $table SET deleted_at=NOW(),version=version+1 WHERE id=?")->execute([$id]);
            $this->repo->audit($userId, 'delete', $entity, $id, $before, null);
            $db->commit();
        } catch (\Throwable $e) { if ($db->inTransaction()) { $db->rollBack(); } throw $e; }
    }
}
