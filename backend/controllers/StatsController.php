<?php

declare(strict_types=1);

class StatsController
{
  public static function index(array $params): void
  {
    $db = Database::getConnection();
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
        $row = $stmt->fetch();
        $stats[$key] = (int)($row['c'] ?? 0);
      } catch (\Throwable $e) {
        error_log("StatsController {$key}: " . $e->getMessage());
        $stats[$key] = 0;
      }
    }

    Response::success($stats, 'Stats retrieved successfully');
  }
}
