<?php

declare(strict_types=1);

/**
 * Runs and tracks database migration files stored in the migrations directory.
 * Provides status reporting on executed and pending migrations.
 */
class MigrationController
{
  /**
   * Execute pending migrations. If a specific migration name is given,
   * only that migration will run. Reports success or failure per file.
   * Requires admin authentication.
   *
   * @param array $params Route parameters optionally containing 'name'.
   * @return void
   */
  public static function run(array $params): void
  {
    AuthMiddleware::authenticate('admin');

    $migration = $params['name'] ?? null;
    $dir = __DIR__ . '/../database/migrations';
    $files = glob("{$dir}/*.sql");

    if (!$files) {
      Response::error('No migration files found', 404);
    }

    $db = Database::getConnection();
    $db->query("CREATE TABLE IF NOT EXISTS migrations (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      migration VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $results = [];
    foreach ($files as $file) {
      $name = basename($file);

      if ($migration && $name !== $migration) {
        continue;
      }

      $stmt = $db->prepare("SELECT id FROM migrations WHERE migration = ?");
      $stmt->execute([$name]);
      if ($stmt->fetch()) {
        if ($migration) {
          Response::error("Migration '{$name}' already executed", 409);
        }
        continue;
      }

      try {
        $sql = file_get_contents($file);
        $statements = explode(';', $sql);

        $db->beginTransaction();
        foreach ($statements as $statement) {
          $statement = trim($statement);
          if ($statement) {
            $db->exec($statement);
          }
        }
        $db->commit();

        $stmt = $db->prepare("INSERT INTO migrations (migration) VALUES (?)");
        $stmt->execute([$name]);

        $results[] = ['migration' => $name, 'status' => 'executed'];
      } catch (Exception $e) {
        $db->rollBack();
        $results[] = ['migration' => $name, 'status' => 'failed', 'error' => $e->getMessage()];
        if ($migration) {
          Response::error("Migration '{$name}' failed: " . $e->getMessage(), 500, $results);
        }
      }

      if ($migration) {
        break;
      }
    }

    Response::success([
      'results' => $results,
      'pending' => self::getPending($db, $files),
    ], 'Migrations executed');
  }

  /**
   * Show the status of all migrations, listing executed and pending files.
   * Requires admin authentication.
   *
   * @param array $params Route parameters (unused).
   * @return void
   */
  public static function status(array $params): void
  {
    AuthMiddleware::authenticate('admin');

    $dir = __DIR__ . '/../database/migrations';
    $files = glob("{$dir}/*.sql");

    $db = Database::getConnection();
    $stmt = $db->query("SELECT migration FROM migrations ORDER BY migration");
    $executed = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $all = array_map(fn($f) => basename($f), $files);
    $pending = array_diff($all, $executed);

    Response::success([
      'executed' => $executed,
      'pending'  => array_values($pending),
      'total'    => count($all),
      'done'     => count($executed),
    ]);
  }

  /**
   * Determine which migration files have not yet been executed.
   *
   * @param PDO   $db    Database connection instance.
   * @param array $files List of migration file paths.
   * @return array List of pending migration filenames.
   */
  private static function getPending(PDO $db, array $files): array
  {
    $stmt = $db->query("SELECT migration FROM migrations ORDER BY migration");
    $executed = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $all = array_map(fn($f) => basename($f), $files);
    return array_values(array_diff($all, $executed));
  }
}
