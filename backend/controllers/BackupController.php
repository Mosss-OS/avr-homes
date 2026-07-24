<?php

declare(strict_types=1);

/**
 * BackupController — admin-only database backup endpoints.
 */
class BackupController
{
  /**
   * Create a new database backup.
   */
  public static function create(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $result = DatabaseBackupService::createBackup();

    if (!$result['success']) {
      Response::error($result['error'], 500);
    }

    Response::success([
      'file' => $result['file'],
      'size' => $result['size'],
    ], 'Backup created successfully', 201);
  }

  /**
   * List available backups.
   */
  public static function list(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $backups = DatabaseBackupService::listBackups();
    Response::success($backups, 'Backups retrieved');
  }

  /**
   * Download a backup file.
   */
  public static function download(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $name = $params['name'] ?? '';
    if (!$name) {
      Response::error('Backup name required', 400);
    }

    $path = DatabaseBackupService::getBackupPath($name);
    if (!$path) {
      Response::error('Backup not found', 404);
    }

    header('Content-Type: application/sql');
    header('Content-Disposition: attachment; filename="' . basename($path) . '"');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
  }
}
