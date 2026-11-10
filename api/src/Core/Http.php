<?php
declare(strict_types=1);
namespace Pelada\Core;

final class Http
{
    public static function body(): array
    {
        if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
            throw new ApiException(415, 'Envie o conteúdo em JSON.');
        }
        $raw = file_get_contents('php://input', false, null, 0, 262145);
        if (strlen($raw) > 262144) { throw new ApiException(413, 'Requisição muito grande.'); }
        try { $data = json_decode($raw, true, 64, JSON_THROW_ON_ERROR); }
        catch (\JsonException) { throw new ApiException(400, 'JSON inválido.'); }
        if (!is_array($data) || array_is_list($data) && $data !== []) { throw new ApiException(400, 'Informe um objeto JSON.'); }
        return $data;
    }

    public static function respond(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        exit;
    }
}
