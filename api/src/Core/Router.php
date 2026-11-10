<?php
declare(strict_types=1);
namespace Pelada\Core;
use Pelada\Controllers\LedgerController;
use Pelada\Domain\Validate;
use Pelada\Repositories\LedgerRepository;
use Pelada\Services\AuthService;

final class Router
{
    public function run(): never
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
        $auth = new AuthService();
        if ($path === '/api/session' && $method === 'GET') { Http::respond($auth->session()); }
        if (in_array($path, ['/api/login', '/api/logout'], true) && $method === 'POST') {
            $auth->csrf();
            Http::respond($path === '/api/login' ? $auth->login(Http::body()) : $auth->logout());
        }
        if ($path === '/api/people' && $method === 'GET') {
            $auth->requireWriter();
            $search = Validate::text($_GET['search'] ?? '', 'Pesquisa', 160, true);
            Http::respond(['data' => (new LedgerRepository(Database::connect()))->people($search)]);
        }
        if (preg_match('#^/api/(events|expenses|finance)(?:/([1-9][0-9]*))?$#', $path, $matches)) {
            $resource = $matches[1];
            $id = isset($matches[2]) ? Validate::integer($matches[2], 'Registro', 1, PHP_INT_MAX) : null;
            $controller = new LedgerController();
            if ($method === 'GET' && $id === null) { $controller->read($resource); }
            if ($resource !== 'finance' && (($method === 'POST' && $id === null) || (in_array($method, ['PUT', 'DELETE'], true) && $id !== null))) {
                $user = $auth->requireWriter();
                $auth->csrf();
                $controller->write($resource, $method, $id, $user['id']);
            }
            throw new ApiException(405, 'Método não permitido.');
        }
        throw new ApiException(404, 'Endpoint não encontrado.');
    }
}
