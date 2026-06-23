<?php

declare(strict_types=1);

class Property
{
  public static function findAll(array $filters = [], int $page = 1, int $perPage = 12, string $sort = 'created_at', string $order = 'desc'): array
  {
    $db = Database::getConnection();

    $conditions = ['p.is_active = 1'];
    $params = [];

    if (!empty($filters['purpose'])) {
      $conditions[] = 'p.purpose = :purpose';
      $params[':purpose'] = $filters['purpose'];
    }

    if (!empty($filters['type'])) {
      $conditions[] = 'p.type = :type';
      $params[':type'] = $filters['type'];
    }

    if (!empty($filters['city'])) {
      $conditions[] = 'p.city LIKE :city';
      $params[':city'] = "%{$filters['city']}%";
    }

    if (!empty($filters['community'])) {
      $conditions[] = 'p.community LIKE :community';
      $params[':community'] = "%{$filters['community']}%";
    }

    if (!empty($filters['min_price'])) {
      $conditions[] = 'p.price >= :min_price';
      $params[':min_price'] = (int)$filters['min_price'];
    }

    if (!empty($filters['max_price'])) {
      $conditions[] = 'p.price <= :max_price';
      $params[':max_price'] = (int)$filters['max_price'];
    }

    if (!empty($filters['beds'])) {
      $conditions[] = 'p.beds >= :beds';
      $params[':beds'] = (int)$filters['beds'];
    }

    if (!empty($filters['baths'])) {
      $conditions[] = 'p.baths >= :baths';
      $params[':baths'] = (int)$filters['baths'];
    }

    if (!empty($filters['featured'])) {
      $conditions[] = 'p.featured = 1';
    }

    if (!empty($filters['q'])) {
      $conditions[] = 'MATCH(p.title, p.description, p.address, p.community) AGAINST(:q IN BOOLEAN MODE)';
      $params[':q'] = $filters['q'];
    }

    if (!empty($filters['ids'])) {
      $placeholders = implode(',', array_fill(0, count($filters['ids']), '?'));
      $conditions[] = "p.id IN ({$placeholders})";
      $params = array_merge($params, $filters['ids']);
    }

    $where = implode(' AND ', $conditions);

    // Count total
    $countSql = "SELECT COUNT(*) FROM properties p WHERE {$where}";
    $countStmt = $db->prepare($countSql);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    // Sort validation
    $allowedSort = ['price', 'created_at', 'title', 'area', 'beds', 'posted_days_ago'];
    $sort = in_array($sort, $allowedSort) ? $sort : 'created_at';
    $order = strtolower($order) === 'asc' ? 'ASC' : 'DESC';

    $offset = ($page - 1) * $perPage;
    $sql = "SELECT p.*, a.name as agent_name, a.agency as agent_agency, 
            a.phone as agent_phone, a.email as agent_email, a.avatar_hue as agent_avatar_hue,
            a.languages as agent_languages, a.is_verified as agent_is_verified
            FROM properties p 
            LEFT JOIN agents a ON p.agent_id = a.id 
            WHERE {$where} 
            ORDER BY p.{$sort} {$order} 
            LIMIT {$perPage} OFFSET {$offset}";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $properties = $stmt->fetchAll();

    // Get images for each property
    foreach ($properties as &$property) {
      $property['id'] = (int)$property['id'];
      $property['agent_id'] = $property['agent_id'] ? (int)$property['agent_id'] : null;
      $property['price'] = (int)$property['price'];
      $property['beds'] = (int)$property['beds'];
      $property['baths'] = (int)$property['baths'];
      $property['area'] = (int)$property['area'];
      $property['featured'] = (bool)$property['featured'];
      $property['is_verified'] = (bool)$property['is_verified'];
      $property['post_days_ago'] = (int)$property['posted_days_ago'];
      $property['amenities'] = json_decode($property['amenities'] ?? '[]', true);
      $property['agent_languages'] = json_decode($property['agent_languages'] ?? '[]', true);
      $property['images'] = self::getImages((int)$property['id']);
    }

    return [
      'data'        => $properties,
      'total'       => $total,
      'page'        => $page,
      'per_page'    => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ];
  }

  public static function findById(int $id): ?array
  {
    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT p.*, a.name as agent_name, a.agency as agent_agency, 
       a.phone as agent_phone, a.email as agent_email, a.avatar_hue as agent_avatar_hue,
       a.languages as agent_languages, a.bio as agent_bio, a.is_verified as agent_is_verified
       FROM properties p 
       LEFT JOIN agents a ON p.agent_id = a.id 
       WHERE p.id = ?"
    );
    $stmt->execute([$id]);
    $property = $stmt->fetch();

    if (!$property) {
      return null;
    }

    $property['id'] = (int)$property['id'];
    $property['agent_id'] = $property['agent_id'] ? (int)$property['agent_id'] : null;
    $property['price'] = (int)$property['price'];
    $property['beds'] = (int)$property['beds'];
    $property['baths'] = (int)$property['baths'];
    $property['area'] = (int)$property['area'];
    $property['featured'] = (bool)$property['featured'];
    $property['is_verified'] = (bool)$property['is_verified'];
    $property['post_days_ago'] = (int)$property['posted_days_ago'];
    $property['amenities'] = json_decode($property['amenities'] ?? '[]', true);
    $property['agent_languages'] = json_decode($property['agent_languages'] ?? '[]', true);
    $property['images'] = self::getImages($id);

    return $property;
  }

  public static function create(array $data): int
  {
    $db = Database::getConnection();

    $slug = self::generateSlug($data['title']);

    $stmt = $db->prepare(
      "INSERT INTO properties (title, slug, description, type, purpose, price, beds, baths, 
       area, city, community, address, lat, lng, amenities, agent_id, featured, is_verified, posted_days_ago)
       VALUES (:title, :slug, :description, :type, :purpose, :price, :beds, :baths, 
       :area, :city, :community, :address, :lat, :lng, :amenities, :agent_id, :featured, :is_verified, 0)"
    );

    $stmt->execute([
      ':title'       => $data['title'],
      ':slug'        => $slug,
      ':description' => $data['description'],
      ':type'        => $data['type'],
      ':purpose'     => $data['purpose'],
      ':price'       => (int)$data['price'],
      ':beds'        => (int)($data['beds'] ?? 0),
      ':baths'       => (int)($data['baths'] ?? 0),
      ':area'        => (int)($data['area'] ?? 0),
      ':city'        => $data['city'],
      ':community'   => $data['community'] ?? '',
      ':address'     => $data['address'],
      ':lat'         => (float)$data['lat'],
      ':lng'         => (float)$data['lng'],
      ':amenities'   => json_encode($data['amenities'] ?? []),
      ':agent_id'    => !empty($data['agent_id']) ? (int)$data['agent_id'] : null,
      ':featured'    => !empty($data['featured']) ? 1 : 0,
      ':is_verified' => !empty($data['is_verified']) ? 1 : 0,
    ]);

    return (int)$db->lastInsertId();
  }

  public static function update(int $id, array $data): bool
  {
    $db = Database::getConnection();

    $fields = [];
    $params = [':id' => $id];

    $allowed = ['title', 'description', 'type', 'purpose', 'price', 'beds', 'baths',
      'area', 'city', 'community', 'address', 'lat', 'lng', 'image',
      'agent_id', 'featured', 'is_verified'];

    foreach ($allowed as $field) {
      if (array_key_exists($field, $data)) {
        if ($field === 'amenities') {
          $fields[] = "{$field} = :{$field}";
          $params[":{$field}"] = json_encode($data[$field]);
        } elseif (in_array($field, ['featured', 'is_verified'])) {
          $fields[] = "{$field} = :{$field}";
          $params[":{$field}"] = !empty($data[$field]) ? 1 : 0;
        } elseif (in_array($field, ['price', 'beds', 'baths', 'area', 'agent_id'])) {
          $fields[] = "{$field} = :{$field}";
          $params[":{$field}"] = (int)$data[$field];
        } elseif (in_array($field, ['lat', 'lng'])) {
          $fields[] = "{$field} = :{$field}";
          $params[":{$field}"] = (float)$data[$field];
        } else {
          $fields[] = "{$field} = :{$field}";
          $params[":{$field}"] = $data[$field];
        }
      }
    }

    if (empty($fields)) {
      return false;
    }

    // Regenerate slug if title changed
    if (isset($data['title'])) {
      $fields[] = 'slug = :slug';
      $params[':slug'] = self::generateSlug($data['title']);
    }

    $sql = "UPDATE properties SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $db->prepare($sql);
    return $stmt->execute($params);
  }

  public static function delete(int $id): bool
  {
    $db = Database::getConnection();
    $stmt = $db->prepare('DELETE FROM properties WHERE id = ?');
    return $stmt->execute([$id]);
  }

  public static function getImages(int $propertyId): array
  {
    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT id, file_path, file_name, is_primary, sort_order 
       FROM property_images WHERE property_id = ? ORDER BY sort_order ASC, id ASC'
    );
    $stmt->execute([$propertyId]);
    $images = $stmt->fetchAll();

    foreach ($images as &$image) {
      $image['id'] = (int)$image['id'];
      $image['is_primary'] = (bool)$image['is_primary'];
      $image['url'] = self::imageUrl($image['file_path']);
    }

    return $images;
  }

  public static function imageUrl(string $path): string
  {
    if (str_starts_with($path, 'http')) {
      return $path;
    }
    $baseUrl = rtrim($_ENV['APP_URL'] ?? 'http://localhost:8000', '/');
    return "{$baseUrl}/{$path}";
  }

  private static function generateSlug(string $title): string
  {
    $slug = strtolower(trim($title));
    $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug);
    $slug = preg_replace('/[\s-]+/', '-', $slug);
    $slug = trim($slug, '-');

    $db = Database::getConnection();
    $original = $slug;
    $counter = 1;

    while (true) {
      $stmt = $db->prepare('SELECT COUNT(*) FROM properties WHERE slug = ?');
      $stmt->execute([$slug]);
      if ((int)$stmt->fetchColumn() === 0) {
        break;
      }
      $slug = "{$original}-{$counter}";
      $counter++;
    }

    return $slug;
  }
}
