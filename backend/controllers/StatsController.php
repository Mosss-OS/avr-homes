<?php

declare(strict_types=1);

class StatsController
{
  public static function index(array $params): void
  {
    try {
      $db = Database::getConnection();
    } catch (\Throwable $e) {
      Response::error('DB connection: ' . $e->getMessage(), 500);
    }

    $stats = [];

    $tables = [
      'total_properties' => "SELECT COUNT(*) as c FROM properties WHERE is_active = 1",
      'featured_properties' => "SELECT COUNT(*) as c FROM properties WHERE featured = 1 AND is_active = 1",
      'cities_covered' => "SELECT COUNT(DISTINCT city) as c FROM properties WHERE is_active = 1",
      'total_agents' => "SELECT COUNT(*) as c FROM agents WHERE is_active = 1",
      'total_users' => "SELECT COUNT(*) as c FROM users",
    ];

    foreach ($tables as $key => $sql) {
      try {
        $stmt = $db->query($sql);
        if ($stmt === false) {
          $stats[$key] = 0;
          continue;
        }
        $row = $stmt->fetch();
        $stats[$key] = (int)($row['c'] ?? 0);
      } catch (\Throwable $e) {
        $stats[$key . '_error'] = $e->getMessage();
        $stats[$key] = 0;
      }
    }

    Response::success($stats, 'Stats retrieved successfully');
  }
}
