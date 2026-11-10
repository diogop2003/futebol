<?php
declare(strict_types=1);
namespace Pelada\Core;

final class Env
{
    public static function load(string $path): void
    {
        if (!is_file($path)) { return; }
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) { continue; }
            [$key, $value] = explode('=', $line, 2);
            if (getenv(trim($key)) === false) { putenv(trim($key) . '=' . trim($value, " \t\n\r\0\x0B\"'")); }
        }
    }

    public static function get(string $key, string $default = ''): string
    {
        $value = getenv($key);
        return $value === false ? $default : $value;
    }
}
