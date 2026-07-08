<?php

declare(strict_types=1);

class StatsController
{
  public static function index(array $params): void
  {
    $db = Database::getConnection();
    $stats = [];

    try {
      $stmt = $db->query("SELECT COUNT(*) as c FROM properties WHERE is_active = 1");
      $stats['total_properties'] = (int)$stmt->fetch()['c'];
    } catch { $stats['total_properties'] = 0; }

    try {
      $stmt = $db->query("SELECT COUNT(*) as c FROM properties WHERE featured = 1 AND is_active = 1");
      $stats['featured_properties'] = (int)$stmt->fetch()['c'];
    } catch { $stats['featured_properties'] = 0; }

    try {
      $stmt = $db->query("SELECT COUNT(DISTINCT city) as c FROM properties WHERE is_active = 1");
      $stats['cities_covered'] = (int)$stmt->fetch()['c'];
    } catch { $stats['cities_covered'] = 0; }

    try {
      $stmt = $db->query("SELECT COUNT(*) as c FROM agents WHERE is_active = 1");
      $stats['total_agents'] = (int)$stmt->fetch()['c'];
    } catch { $stats['total_agents'] = 0; }

    try {
      $stmt = $db->query("SELECT COUNT(*) as c FROM users");
      $stats['total_users'] = (int)$stmt->fetch()['c'];
    } catch { $stats['total_users'] = 0; }

    Response::success($stats, 'Stats retrieved successfully');
  }
}
