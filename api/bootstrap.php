<?php
declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    $prefix = 'Pelada\\';
    if (str_starts_with($class, $prefix)) {
        $file = __DIR__ . '/src/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) { require $file; }
    }
});
Pelada\Core\Env::load(__DIR__ . '/.env');
date_default_timezone_set('America/Sao_Paulo');
