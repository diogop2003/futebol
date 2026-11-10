<?php
declare(strict_types=1);
namespace Pelada\Core;
use PDO;

final class Migrator
{
    public static function run(PDO $db): array
    {
        if ((int) $db->query("SELECT GET_LOCK('pelada_schema_migration', 10)")->fetchColumn() !== 1) { throw new \RuntimeException('Another migration is running.'); }
        $applied = [];
        try {
            $db->exec('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(190) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
            foreach (glob(dirname(__DIR__, 2) . '/migrations/*.sql') as $file) {
                $name = basename($file); $checksum = hash_file('sha256', $file);
                $stmt = $db->prepare('SELECT checksum FROM schema_migrations WHERE name=?'); $stmt->execute([$name]);
                $existing = $stmt->fetchColumn();
                if ($existing !== false) {
                    if ($existing !== $checksum) { throw new \RuntimeException("Migration modificada após aplicação: $name"); }
                    continue;
                }
                // MariaDB DDL commits implicitly: migrations must be additive and safely resumable.
                foreach (explode(';', file_get_contents($file)) as $sql) { if (trim($sql) !== '') { $db->exec($sql); } }
                $db->prepare('INSERT INTO schema_migrations(name,checksum) VALUES(?,?)')->execute([$name, $checksum]);
                $applied[] = $name;
            }
        } finally { $db->query("SELECT RELEASE_LOCK('pelada_schema_migration')"); }
        return $applied;
    }
}
