<?php

/**
 * Agent model — data access for agent profiles.
 *
 * Provides CRUD operations, slug generation, photo updates, and
 * includes related property listings in detail responses.
 *
 * @package AvrHomes
 */

declare(strict_types=1);

/**
 * Data-access layer for the agents table.
 */
class Agent
{
  private const PUBLIC_FIELDS = 'id, slug, photo_url, name, agency, phone, email, whatsapp, languages, listings, avatar_hue, bio, experience, state, city, lasrera_number, niesv_number, avg_monthly_listings, property_types, avg_deal_size, specialization, social_instagram, social_facebook, social_linkedin, social_tiktok, social_youtube, is_verified, created_at';

  /**
   * Retrieve all active agents ordered by listing count.
   *
   * @return array<int,array<string,mixed>> List of agent summaries.
   */
  public static function findAll(): array
  {
    $db = Database::getConnection();
    $stmt = $db->query(
      "SELECT id, slug, photo_url, name, agency, phone, email, languages, listings, avatar_hue, bio, is_verified
       FROM agents WHERE is_active = 1 ORDER BY listings DESC"
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

  /**
   * Find an active agent by primary key, including their recent properties.
   *
   * @param int $id Agent ID.
   * @return array|null Agent detail array or null if not found.
   */
  public static function findById(int $id): ?array
  {
    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT id, slug, photo_url, name, agency, phone, email, whatsapp, languages, listings, avatar_hue, bio,
        experience, state, city, lasrera_number, niesv_number, is_verified
       FROM agents WHERE id = ? AND is_active = 1"
    );
    $stmt->execute([$id]);
    $agent = $stmt->fetch();

    if (!$agent) {
      return null;
    }

    return self::formatWithProperties($db, $agent);
  }

  /**
   * Find an active agent by URL slug, including their recent properties.
   *
   * @param string $slug Agent URL slug.
   * @return array|null Agent detail array or null if not found.
   */
  public static function findBySlug(string $slug): ?array
  {
    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT id, slug, photo_url, name, agency, phone, email, whatsapp, languages, listings, avatar_hue, bio,
        experience, state, city, lasrera_number, niesv_number, is_verified
       FROM agents WHERE slug = ? AND is_active = 1"
    );
    $stmt->execute([$slug]);
    $agent = $stmt->fetch();

    if (!$agent) {
      return null;
    }

    return self::formatWithProperties($db, $agent);
  }

  /**
   * Find an active agent by the linked user ID.
   *
   * @param int $userId User account ID.
   * @return array|null Full agent row or null if not found.
   */
  public static function findByUserId(int $userId): ?array
  {
    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT *
       FROM agents WHERE user_id = ? AND is_active = 1"
    );
    $stmt->execute([$userId]);
    $agent = $stmt->fetch();

    if (!$agent) {
      return null;
    }

    return self::format($agent);
  }

  /**
   * Update an agent's allowed fields and regenerate slug if the name changed.
   *
   * @param int   $id   Agent ID.
   * @param array $data Associative array of fields to update.
   * @return bool True on success.
   */
  public static function update(int $id, array $data): bool
  {
    $db = Database::getConnection();
    $allowedFields = [
      'name', 'agency', 'phone', 'whatsapp', 'languages', 'bio',
      'experience', 'state', 'city', 'lasrera_number', 'niesv_number',
      'avg_monthly_listings', 'property_types', 'avg_deal_size', 'specialization',
      'social_instagram', 'social_facebook', 'social_linkedin', 'social_tiktok',
      'social_youtube', 'why_join', 'support_needed', 'referral_source',
    ];

    $sets = [];
    $bindings = [];

    foreach ($allowedFields as $field) {
      if (array_key_exists($field, $data)) {
        $value = $data[$field];
        if (in_array($field, ['languages', 'property_types', 'specialization', 'support_needed']) && is_array($value)) {
          $value = json_encode($value);
        }
        $sets[] = "{$field} = ?";
        $bindings[] = $value;
      }
    }

    if ($data['name'] ?? null) {
      $slug = self::generateSlug($data['name']);
      $sets[] = 'slug = ?';
      $bindings[] = $slug;
    }

    if (empty($sets)) {
      return false;
    }

    $bindings[] = $id;
    $stmt = $db->prepare('UPDATE agents SET ' . implode(', ', $sets) . ' WHERE id = ?');
    return $stmt->execute($bindings);
  }

  /**
   * Update the agent's photo URL.
   *
   * @param int    $id       Agent ID.
   * @param string $photoUrl New photo URL.
   * @return bool True on success.
   */
  public static function updatePhoto(int $id, string $photoUrl): bool
  {
    $db = Database::getConnection();
    $stmt = $db->prepare('UPDATE agents SET photo_url = ? WHERE id = ?');
    return $stmt->execute([$photoUrl, $id]);
  }

  /**
   * Generate a unique URL slug from an agent name.
   *
   * Appends a numeric suffix if the slug already exists.
   *
   * @param string $name Agent display name.
   * @return string Unique slug.
   */
  public static function generateSlug(string $name): string
  {
    $slug = strtolower(trim($name));
    $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug);
    $slug = preg_replace('/[\s-]+/', '-', $slug);
    $slug = trim($slug, '-');

    $db = Database::getConnection();
    $original = $slug;
    $counter = 1;

    while (true) {
      $stmt = $db->prepare('SELECT COUNT(*) FROM agents WHERE slug = ?');
      $stmt->execute([$slug]);
      if ((int)$stmt->fetchColumn() === 0) {
        break;
      }
      $slug = "{$original}-{$counter}";
      $counter++;
    }

    return $slug;
  }

  /**
   * Format an agent row and attach their latest properties.
   *
   * @param PDO   $db    Database connection.
   * @param array $agent Raw agent row.
   * @return array Formatted agent with properties array.
   */
  private static function formatWithProperties(PDO $db, array $agent): array
  {
    $agent = self::format($agent);

    $propStmt = $db->prepare(
      'SELECT id, title, slug, type, purpose, price, image, city, community, beds, baths, area, featured, is_verified
       FROM properties WHERE agent_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 20'
    );
    $propStmt->execute([$agent['id']]);
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

  /**
   * Cast agent scalar fields to their proper types and decode JSON columns.
   *
   * @param array $agent Raw agent row.
   * @return array Cast and decoded agent array.
   */
  private static function format(array $agent): array
  {
    $agent['id'] = (int)$agent['id'];
    $agent['listings'] = (int)($agent['listings'] ?? 0);
    $agent['avatar_hue'] = (int)($agent['avatar_hue'] ?? 195);
    $agent['is_verified'] = (bool)($agent['is_verified'] ?? false);

    foreach (['languages', 'property_types', 'specialization', 'support_needed'] as $jsonField) {
      $agent[$jsonField] = isset($agent[$jsonField]) ? json_decode($agent[$jsonField], true) : [];
    }

    return $agent;
  }
}
