<?php
declare(strict_types=1);
namespace Pelada\Domain;
use Pelada\Core\ApiException;

final class Validate
{
    public const KINDS = ['monthly', 'daily', 'barbecue'];
    public const CATEGORIES = ['field', 'goalkeepers', 'barbecue', 'additional'];

    public static function text(mixed $value, string $label, int $max = 160, bool $optional = false): string
    {
        if (!is_string($value)) { throw new ApiException(422, "$label inválido."); }
        $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
        if ((!$optional && $value === '') || strlen($value) > $max || preg_match('/[<>\x00-\x1f]/u', $value)) {
            throw new ApiException(422, "$label inválido ou muito longo.");
        }
        return $value;
    }

    public static function integer(mixed $value, string $label, int $min, int $max): int
    {
        if (is_bool($value) || is_array($value) || is_object($value)) { throw new ApiException(422, "$label inválido."); }
        $n = filter_var($value, FILTER_VALIDATE_INT);
        if ($n === false || $n < $min || $n > $max) { throw new ApiException(422, "$label inválido."); }
        return $n;
    }

    public static function date(mixed $value): string
    {
        if (!is_string($value)) { throw new ApiException(422, 'Data inválida.'); }
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (!$date || $date->format('Y-m-d') !== $value || (int) $date->format('Y') < 2000 || (int) $date->format('Y') > 2100) {
            throw new ApiException(422, 'Data inválida (use AAAA-MM-DD entre 2000 e 2100).');
        }
        return $value;
    }

    public static function period(array $data): array
    {
        $year = self::integer($data['year'] ?? null, 'Ano', 2000, 2100);
        $month = self::integer($data['month'] ?? null, 'Mês', 1, 12);
        $start = sprintf('%04d-%02d-01', $year, $month);
        return [$start, (new \DateTimeImmutable($start))->modify('+1 month')->format('Y-m-d')];
    }

    public static function kind(mixed $value): string
    {
        if (!in_array($value, self::KINDS, true)) { throw new ApiException(422, 'Tipo de cobrança inválido.'); }
        return $value;
    }

    public static function nameKey(string $name): string
    {
        // Stable across Windows/Linux locales; iconv transliteration varies by OS locale.
        return strtolower(strtr($name, [
            'á'=>'a','à'=>'a','â'=>'a','ã'=>'a','ä'=>'a','Á'=>'a','À'=>'a','Â'=>'a','Ã'=>'a','Ä'=>'a',
            'é'=>'e','è'=>'e','ê'=>'e','ë'=>'e','É'=>'e','È'=>'e','Ê'=>'e','Ë'=>'e',
            'í'=>'i','ì'=>'i','î'=>'i','ï'=>'i','Í'=>'i','Ì'=>'i','Î'=>'i','Ï'=>'i',
            'ó'=>'o','ò'=>'o','ô'=>'o','õ'=>'o','ö'=>'o','Ó'=>'o','Ò'=>'o','Ô'=>'o','Õ'=>'o','Ö'=>'o',
            'ú'=>'u','ù'=>'u','û'=>'u','ü'=>'u','Ú'=>'u','Ù'=>'u','Û'=>'u','Ü'=>'u','ç'=>'c','Ç'=>'c','ñ'=>'n','Ñ'=>'n'
        ]));
    }

    public static function uuid(mixed $value): string
    {
        if (!is_string($value) || !preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i', $value)) { throw new ApiException(422, 'Identificador de operação inválido.'); }
        return strtolower($value);
    }
}
