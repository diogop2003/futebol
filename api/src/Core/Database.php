<?php
declare(strict_types=1);
namespace Pelada\Core;
use PDO;

final class Database
{
    public static function connect(): PDO
    {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', Env::get('DB_HOST', '127.0.0.1'), Env::get('DB_PORT', '3306'), Env::get('DB_DATABASE', 'pelada'));
        $db = new PDO($dsn, Env::get('DB_USERNAME', 'pelada'), Env::get('DB_PASSWORD'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false,
        ]);
        $db->exec("SET time_zone = '-03:00'");
        return $db;
    }
}
