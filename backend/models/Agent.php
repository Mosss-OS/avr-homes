<?php

declare(strict_types=1);

class Agent
{
  public static function findAll(): array
  {
    $db = Database::getConnection();
    $stmt = $db->query(
      'SELECT id, name, agency, phone, email, languages, listings, avatar_hue, bio, is_verified 
       FROM agents WHERE is_active = 1 ORDER BY listings DESC'
    );
    $agents = $stmt->fetchAll();

    foreach ($agents as &$agent) {
      $agent['id'] = (int)$agent['id'];
      $agent['listings'] = (int)$agent['listings'];
      $agent['avatar_hue'] = (int)$agent['avatar_hue'];
      $agent['is_verified'] = (bool)$agent['is_verified'];
      $agent['languages'] = json_decode($agent['languages'] ?? '[]', true);
    }

    return $agents;
  }

  public static function findById(int $id): ?array
  {
    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT id, name, agency, phone, email, languages, listings, avatar_hue, bio, is_verified 
       FROM agents WHERE id = ? AND is_active = 1'
    );
    $stmt->execute([$id]);
    $agent = $stmt->fetch();

    if (!$agent) {
      return null;
    }

    $agent['id'] = (int)$agent['id'];
    $agent['listings'] = (int)$agent['listings'];
    $agent['avatar_hue'] = (int)$agent['avatar_hue'];
    $agent['is_verified'] = (bool)$agent['is_verified'];
    $agent['languages'] = json_decode($agent['languages'] ?? '[]', true);

    // Get agent's properties
    $propStmt = $db->prepare(
      'SELECT id, title, slug, type, purpose, price, image, city, community, beds, baths, area, featured, is_verified 
       FROM properties WHERE agent_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 20'
    );
    $propStmt->execute([$id]);
    $properties = $propStmt->fetchAll();

    foreach ($properties as &$p) {
      $p['id'] = (int)$p['id'];
      $p['price'] = (int)$p['price'];
      $p['beds'] = (int)$p['beds'];
      $p['baths'] = (int)$p['baths'];
      $p['area'] = (int)$p['area'];
      $p['featured'] = (bool)$p['featured'];
      $p['is_verified'] = (bool)$p['is_verified'];
    }

    $agent['properties'] = $properties;

    return $agent;
  }
}
