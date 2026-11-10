<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
if (!preg_match('/^pelada_test_[a-f0-9]{12}$/', getenv('DB_DATABASE') ?: '')) { throw new RuntimeException('Use um banco de testes isolado.'); }
$db=Pelada\Core\Database::connect();
$db->exec("INSERT INTO financial_config(id,basis,opening_date,opening_balance,description,created_by) VALUES(1,'reference','2026-10-01',1985.48,'Saldo de setembro confirmado pelo responsável',1)");
