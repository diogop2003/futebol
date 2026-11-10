<?php
declare(strict_types=1);
namespace Pelada\Domain;
use Pelada\Core\ApiException;

final class Money
{
    public static function cents(mixed $value, bool $negative = false, int $digits = 9): int
    {
        // Financial input is a decimal string; never perform arithmetic with binary floats.
        if (!is_string($value) || !preg_match('/^' . ($negative ? '-?' : '') . '\d{1,' . $digits . '}(?:\.\d{1,2})?$/', $value)) {
            throw new ApiException(422, 'Informe um valor monetário válido, com até duas casas decimais.');
        }
        $sign = str_starts_with($value, '-') ? -1 : 1;
        $parts = explode('.', ltrim($value, '-'));
        return $sign * ((int) $parts[0] * 100 + (int) str_pad($parts[1] ?? '', 2, '0'));
    }

    public static function decimal(int $cents): string
    {
        return ($cents < 0 ? '-' : '') . intdiv(abs($cents), 100) . '.' . str_pad((string) (abs($cents) % 100), 2, '0', STR_PAD_LEFT);
    }
}
