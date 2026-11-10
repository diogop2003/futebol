<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
use Pelada\Core\ApiException;
use Pelada\Domain\{Money, Validate};

$count = 0;
function check(bool $condition, string $label): void { global $count; if (!$condition) { throw new RuntimeException($label); } $count++; }
function rejects(callable $callback, string $label): void { try { $callback(); } catch (ApiException $e) { check($e->status === 422, $label); return; } throw new RuntimeException('Should reject: ' . $label); }
check(Money::cents('37.06') * 17 === 63002, 'Precisão do histórico (sem arredondar 630,02 para 630,00)');
check(Money::decimal(198548) === '1985.48', 'Conversão monetária');
check(Money::decimal(-123) === '-1.23', 'Saldo negativo');
check(Money::cents('-1.23', true) === -123, 'Saldo inicial negativo');
foreach (['1.234', '-1', '1e3', 'NaN', '1,00', '', null, 1.20] as $invalid) rejects(fn() => Money::cents($invalid), 'Dinheiro inválido');
check(Validate::date('2024-02-29') === '2024-02-29', 'Ano bissexto');
rejects(fn() => Validate::date('2026-02-29'), 'Data impossível');
rejects(fn() => Validate::date('2026-13-01'), 'Mês impossível');
check(Validate::period(['year' => 2026, 'month' => 12]) === ['2026-12-01', '2027-01-01'], 'Virada do ano');
rejects(fn() => Validate::period(['year' => 2026]), 'Período obrigatório');
rejects(fn() => Validate::text('<script>alert(1)</script>', 'Nome'), 'Entrada HTML');
check(Validate::nameKey('João Silva') === Validate::nameKey('JOAO SILVA'), 'Normalização de identidade');
echo "$count testes unitários passaram.\n";
