<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';

use Pelada\Core\{ApiException, Http, Router};
use Pelada\Services\AuthService;

ini_set('display_errors', '0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

try {
    AuthService::start();
    (new Router())->run();
} catch (ApiException $e) {
    if ($e->status === 429) { header('Retry-After: 900'); }
    Http::respond(['error' => ['message' => $e->getMessage()]], $e->status);
} catch (PDOException $e) {
    $requestId = bin2hex(random_bytes(8));
    error_log("[$requestId] Database failure SQLSTATE=" . $e->getCode());
    $duplicate = $e->getCode() === '23000';
    Http::respond(['error' => ['message' => $duplicate ? 'Registro duplicado ou vínculo inválido. Confira os dados.' : 'Não foi possível acessar os dados. Tente novamente mais tarde.', 'requestId' => $requestId]], $duplicate ? 409 : 503);
} catch (Throwable $e) {
    $requestId = bin2hex(random_bytes(8));
    error_log("[$requestId] " . get_class($e) . ': ' . $e->getMessage());
    Http::respond(['error' => ['message' => 'Não foi possível concluir a operação. Tente novamente.', 'requestId' => $requestId]], 500);
}
