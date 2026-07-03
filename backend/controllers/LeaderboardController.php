<?php

class LeaderboardController
{
  public static function weekly(array $params): void
  {
    $db = Database::getConnection();

    $weekStart = date('Y-m-d', strtotime('monday this week'));

    $stmt = $db->prepare(
      "SELECT a.id, a.name, a.slug, a.photo_url, a.agency, a.city, a.listings,
              COALESCE(weekly_leads, 0) as weekly_leads,
              COALESCE(weekly_listings, 0) as weekly_listings
       FROM agents a
       LEFT JOIN (
         SELECT agent_id, COUNT(*) as weekly_leads
         FROM inquiries i
         JOIN properties p ON p.id = i.property_id
         WHERE i.created_at >= ? AND p.agent_id = a.id
         GROUP BY agent_id
       ) l ON l ON l ON l.agent_id = a.id
       LEFT JOIN (
         SELECT agent_id, COUNT(*) as weekly_listings
         FROM properties
         WHERE created_at >= ? AND agent_id = a.id
         GROUP BY agent_id
       ) p2 ON p2.agent_id = a.id
       WHERE a.is_active = 1
       ORDER BY (COALESCE(weekly_leads, 0) + COALESCE(weekly_listings, 0)) DESC
       LIMIT 10"
    );
    $stmt->execute([$weekStart, $weekStart]);
    $leaders = $stmt->fetchAll();

    foreach ($leaders as &$leader) {
      $leader['id'] = (int)$leader['id'];
      $leader['listings'] = (int)$leader['listings'];
      $leader['weekly_leads'] = (int)$leader['weekly_leads'];
      $leader['weekly_listings'] = (int)$leader['weekly_listings'];
      $leader['score'] = $leader['weekly_leads'] + $leader['weekly_listings'];
    }

    Response::success([
      'period' => 'weekly',
      'period_start' => $weekStart,
      'leaders' => $leaders,
    ], 'Weekly leaderboard retrieved');
  }

  public static function monthly(array $params): void
  {
    $db = Database::getConnection();

    $monthStart = date('Y-m-01');

    $stmt = $db->prepare(
      "SELECT a.id, a.name, a.slug, a.photo_url, a.agency, a.city, a.listings,
              COALESCE(monthly_leads, 0) as monthly_leads,
              COALESCE(monthly_deal_value, 0) as monthly_deal_value
       FROM agents a
       LEFT JOIN (
         SELECT p.agent_id, COUNT(*) as monthly_leads
         FROM inquiries i
         JOIN properties p ON p.id = i.property_id
         WHERE i.created_at >= ? AND p.agent_id = a.id
         GROUP BY p.agent_id
       ) l ON l.agent_id = a.id
       LEFT JOIN (
         SELECT p.agent_id, SUM(p.price) as monthly_deal_value
         FROM inquiries i
         JOIN properties p ON p.id = i.property_id
         WHERE i.status = 'closed' AND i.created_at >= ? AND p.agent_id = a.id
         GROUP BY p.agent_id
       ) d ON d.agent_id = a.id
       WHERE a.is_active = 1
       ORDER BY COALESCE(monthly_deal_value, 0) DESC
       LIMIT 10"
    );
    $stmt->execute([$monthStart, $monthStart]);
    $leaders = $stmt->fetchAll();

    foreach ($leaders as &$leader) {
      $leader['id'] = (int)$leader['id'];
      $leader['listings'] = (int)$leader['listings'];
      $leader['monthly_leads'] = (int)$leader['monthly_leads'];
      $leader['monthly_deal_value'] = (float)$leader['monthly_deal_value'];
      $leader['score'] = $leader['monthly_deal_value'];
    }

    Response::success([
      'period' => 'monthly',
      'period_start' => $monthStart,
      'leaders' => $leaders,
    ], 'Monthly leaderboard retrieved');
  }

  public static function quarterly(array $params): void
  {
    $db = Database::getConnection();

    $quarterStart = date('Y-m-01', strtotime('-' . ((date('n') - 1) % 3) . ' months'));

    $stmt = $db->prepare(
      "SELECT a.id, a.name, a.slug, a.photo_url, a.agency, a.city, a.listings,
              COALESCE(q_deal_value, 0) as quarterly_deal_value,
              COALESCE(q_listings, 0) as quarterly_listings
       FROM agents a
       LEFT JOIN (
         SELECT p.agent_id, SUM(p.price) as q_deal_value, COUNT(*) as q_listings
         FROM properties p
         WHERE p.created_at >= ? AND p.is_active = 1
         GROUP BY p.agent_id
       ) q ON q.agent_id = a.id
       WHERE a.is_active = 1
       ORDER BY COALESCE(q_deal_value, 0) DESC
       LIMIT 10"
    );
    $stmt->execute([$quarterStart]);
    $leaders = $stmt->fetchAll();

    foreach ($leaders as &$leader) {
      $leader['id'] = (int)$leader['id'];
      $leader['listings'] = (int)$leader['listings'];
      $leader['quarterly_deal_value'] = (float)$leader['quarterly_deal_value'];
      $leader['quarterly_listings'] = (int)$leader['quarterly_listings'];
      $leader['score'] = $leader['quarterly_deal_value'];
    }

    Response::success([
      'period' => 'quarterly',
      'period_start' => $quarterStart,
      'leaders' => $leaders,
    ], 'Quarterly leaderboard retrieved');
  }

  public static function refresh(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    // In a real implementation, this would recalculate cached leaderboard data
    // For now, we just acknowledge the request
    Response::success(null, 'Leaderboard refresh triggered');
  }
}