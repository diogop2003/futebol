<?php
declare(strict_types=1);
namespace Pelada\Services;
use PDO;
use Pelada\Domain\{Money, Validate};

final class FinanceService
{
    public function __construct(private readonly PDO $db) {}

    private function revenues(string $start, string $end): array
    {
        $stmt = $this->db->prepare('SELECT e.kind,COUNT(*) AS participants,COALESCE(SUM(p.amount),0) AS expected,COALESCE(SUM(CASE WHEN p.paid=1 THEN p.amount ELSE 0 END),0) AS received FROM events e JOIN event_participants p ON p.event_id=e.id WHERE e.deleted_at IS NULL AND e.reference_date>=? AND e.reference_date<? GROUP BY e.kind');
        $stmt->execute([$start, $end]);
        $result = [];
        foreach ($stmt->fetchAll() as $row) {
            $expected = Money::cents((string) $row['expected'], false, 15); $received = Money::cents((string) $row['received'], false, 15);
            $result[$row['kind']] = ['count' => (int) $row['participants'], 'expected' => Money::decimal($expected), 'received' => Money::decimal($received), 'pending' => Money::decimal($expected - $received)];
        }
        foreach (Validate::KINDS as $kind) { $result[$kind] ??= ['count' => 0, 'expected' => '0.00', 'received' => '0.00', 'pending' => '0.00']; }
        return $result;
    }

    private function expenses(string $start, string $end): array
    {
        $stmt = $this->db->prepare('SELECT category,COALESCE(SUM(amount),0) AS amount FROM expenses WHERE deleted_at IS NULL AND reference_date>=? AND reference_date<? GROUP BY category');
        $stmt->execute([$start, $end]);
        $result = array_fill_keys(Validate::CATEGORIES, '0.00');
        foreach ($stmt->fetchAll() as $row) { $result[$row['category']] = Money::decimal(Money::cents((string) $row['amount'], false, 15)); }
        return $result;
    }

    private function sum(array $values): int
    {
        return array_sum(array_map(static fn($value) => Money::cents($value, false, 15), $values));
    }

    private function net(string $start, string $end): int
    {
        return $this->sum(array_column($this->revenues($start, $end), 'received')) - $this->sum($this->expenses($start, $end));
    }

    public function summary(string $start, string $end): array
    {
        // All totals come from the same database snapshot, including the accumulated balance.
        $this->db->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        $this->db->beginTransaction();
        try {
            $revenue = $this->revenues($start, $end); $categories = $this->expenses($start, $end);
            $expected = $this->sum(array_column($revenue, 'expected'));
            $received = $this->sum(array_column($revenue, 'received'));
            $expenses = $this->sum($categories);
            $config = $this->db->query('SELECT opening_date,opening_balance,description FROM financial_config WHERE id=1')->fetch() ?: null;
            $previous = $accumulated = null;
            if ($config && $start >= $config['opening_date']) {
                $opening = Money::cents($config['opening_balance'], true);
                $previous = Money::decimal($opening + $this->net($config['opening_date'], $start));
                $accumulated = Money::decimal($opening + $this->net($config['opening_date'], $end));
            }
            $this->db->commit();
            return ['period' => substr($start, 0, 7), 'basis' => 'reference', 'expected' => Money::decimal($expected), 'received' => Money::decimal($received), 'pending' => Money::decimal($expected - $received), 'expenses' => Money::decimal($expenses), 'balance' => Money::decimal($received - $expenses), 'previousBalance' => $previous, 'accumulatedBalance' => $accumulated, 'opening' => $config, 'revenues' => $revenue, 'categories' => $categories];
        } catch (\Throwable $e) { if ($this->db->inTransaction()) { $this->db->rollBack(); } throw $e; }
    }
}
