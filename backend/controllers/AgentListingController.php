<?php

declare(strict_types=1);

class AgentListingController
{
  private static function getAgentId(int $userId): int
  {
    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT id FROM agents WHERE user_id = ? AND is_active = 1');
    $stmt->execute([$userId]);
    $agent = $stmt->fetch();
    if (!$agent) {
      Response::error('Agent profile not found. Complete your profile first.', 404);
    }
    return (int)$agent['id'];
  }

  private static function checkListingLimit(int $userId): void
  {
    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT s.listings_limit, 
        (SELECT COUNT(*) FROM properties p 
         JOIN agents a ON p.agent_id = a.id 
         WHERE a.user_id = ? AND p.is_active = 1) as current_listings
       FROM agent_subscriptions s 
       WHERE s.agent_id = ? AND s.status = 'active'"
    );
    $stmt->execute([$userId, $userId]);
    $sub = $stmt->fetch();

    if ($sub && (int)$sub['current_listings'] >= (int)$sub['listings_limit']) {
      Response::error(
        "Listing limit reached ({$sub['listings_limit']}). Upgrade your plan to add more listings.",
        403
      );
    }
  }

  public static function index(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $status  = $_GET['status'] ?? null;
    $search  = $_GET['q'] ?? null;

    $db = Database::getConnection();
    $conditions = ['p.agent_id = :agent_id'];
    $params = [':agent_id' => $agentId];

    if ($status) {
      if ($status === 'draft') {
        $conditions[] = 'p.is_active = 0';
      } elseif ($status === 'archived') {
        $conditions[] = 'p.is_active = 2';
      } elseif ($status === 'published') {
        $conditions[] = 'p.is_active = 1';
      }
    } else {
      $conditions[] = 'p.is_active IN (0, 1)';
    }

    if ($search) {
      $conditions[] = '(p.title LIKE :q OR p.city LIKE :q2 OR p.community LIKE :q3)';
      $params[':q'] = "%{$search}%";
      $params[':q2'] = "%{$search}%";
      $params[':q3'] = "%{$search}%";
    }

    $where = implode(' AND ', $conditions);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM properties p WHERE {$where}");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $sql = "SELECT p.id, p.title, p.slug, p.type, p.purpose, p.price, p.image,
            p.beds, p.baths, p.area, p.city, p.community, p.is_active, p.featured,
            p.is_verified, p.posted_days_ago, p.created_at, p.updated_at,
            (SELECT COUNT(*) FROM inquiries WHERE property_id = p.id) as inquiry_count
            FROM properties p 
            WHERE {$where} 
            ORDER BY p.updated_at DESC 
            LIMIT {$perPage} OFFSET {$offset}";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $listings = $stmt->fetchAll();

    foreach ($listings as &$listing) {
      $listing['id'] = (int)$listing['id'];
      $listing['price'] = (int)$listing['price'];
      $listing['beds'] = (int)$listing['beds'];
      $listing['baths'] = (int)$listing['baths'];
      $listing['area'] = (int)$listing['area'];
      $listing['featured'] = (bool)$listing['featured'];
      $listing['is_verified'] = (bool)$listing['is_verified'];
      $listing['inquiry_count'] = (int)$listing['inquiry_count'];
      $listing['status'] = (int)$listing['is_active'] === 0 ? 'draft' : ((int)$listing['is_active'] === 2 ? 'archived' : 'published');
    }

    Response::success([
      'data'        => $listings,
      'total'       => $total,
      'page'        => $page,
      'per_page'    => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ], 'Listings retrieved successfully');
  }

  public static function show(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid listing ID', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT p.* FROM properties p WHERE p.id = ? AND p.agent_id = ?"
    );
    $stmt->execute([$id, $agentId]);
    $property = $stmt->fetch();

    if (!$property) {
      Response::error('Listing not found or access denied', 404);
    }

    $property['id'] = (int)$property['id'];
    $property['price'] = (int)$property['price'];
    $property['beds'] = (int)$property['beds'];
    $property['baths'] = (int)$property['baths'];
    $property['area'] = (int)$property['area'];
    $property['featured'] = (bool)$property['featured'];
    $property['is_verified'] = (bool)$property['is_verified'];
    $property['amenities'] = json_decode($property['amenities'] ?? '[]', true);
    $property['images'] = Property::getImages($id);

    Response::success($property, 'Listing retrieved successfully');
  }

  public static function store(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    self::checkListingLimit((int)$user['id']);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->required('title', 'Title')
      ->required('description', 'Description')
      ->required('type', 'Type')
      ->inArray('type', ['apartment', 'villa', 'townhouse', 'penthouse', 'studio'], 'Type')
      ->required('purpose', 'Purpose')
      ->inArray('purpose', ['buy', 'rent'], 'Purpose')
      ->required('price', 'Price')
      ->numeric('price', 'Price')
      ->required('city', 'City')
      ->required('address', 'Address')
      ->required('lat', 'Latitude')
      ->numeric('lat', 'Latitude')
      ->required('lng', 'Longitude')
      ->numeric('lng', 'Longitude');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    $isActive = isset($data['status']) && $data['status'] === 'published' ? 1 : 0;

    $db = Database::getConnection();
    $slug = self::generateSlug($data['title'], $db);

    $stmt = $db->prepare(
      "INSERT INTO properties (title, slug, description, type, purpose, price, beds, baths,
       area, city, community, address, lat, lng, image, video_url, virtual_tour_url, floor_plan_url, amenities, agent_id, featured, is_verified, is_active, posted_days_ago, created_at, updated_at)
       VALUES (:title, :slug, :description, :type, :purpose, :price, :beds, :baths,
       :area, :city, :community, :address, :lat, :lng, :image, :video_url, :virtual_tour_url, :floor_plan_url, :amenities, :agent_id, :featured, :is_verified, :is_active, 0, NOW(), NOW())"
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
      ':image'            => $data['image'] ?? null,
      ':video_url'        => $data['video_url'] ?? null,
      ':virtual_tour_url' => $data['virtual_tour_url'] ?? null,
      ':floor_plan_url'   => $data['floor_plan_url'] ?? null,
      ':amenities'        => json_encode($data['amenities'] ?? []),
      ':agent_id'    => $agentId,
      ':featured'    => !empty($data['featured']) ? 1 : 0,
      ':is_verified' => 0,
      ':is_active'   => $isActive,
    ]);

    $propertyId = (int)$db->lastInsertId();

    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'create_listing', 'property', $propertyId, $_SERVER['REMOTE_ADDR'] ?? '']);

    $stmt = $db->prepare("SELECT p.* FROM properties p WHERE p.id = ?");
    $stmt->execute([$propertyId]);
    $property = $stmt->fetch();

    $property['id'] = (int)$property['id'];
    $property['price'] = (int)$property['price'];
    $property['beds'] = (int)$property['beds'];
    $property['baths'] = (int)$property['baths'];
    $property['area'] = (int)$property['area'];
    $property['featured'] = (bool)$property['featured'];
    $property['is_verified'] = (bool)$property['is_verified'];
    $property['amenities'] = json_decode($property['amenities'] ?? '[]', true);

    Response::success($property, 'Listing created successfully', 201);
  }

  public static function update(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid listing ID', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT id, is_active FROM properties WHERE id = ? AND agent_id = ?");
    $stmt->execute([$id, $agentId]);
    $existing = $stmt->fetch();

    if (!$existing) {
      Response::error('Listing not found or access denied', 404);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    if (empty($input)) {
      Response::error('No data provided for update', 400);
    }

    $validator = new Validator($input);
    if (isset($input['type'])) {
      $validator->inArray('type', ['apartment', 'villa', 'townhouse', 'penthouse', 'studio'], 'Type');
    }
    if (isset($input['purpose'])) {
      $validator->inArray('purpose', ['buy', 'rent'], 'Purpose');
    }
    if (isset($input['price'])) {
      $validator->numeric('price', 'Price');
    }
    if (isset($input['lat'])) {
      $validator->numeric('lat', 'Latitude');
    }
    if (isset($input['lng'])) {
      $validator->numeric('lng', 'Longitude');
    }

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $fields = [];
    $updateParams = [];

    $allowed = ['title', 'description', 'type', 'purpose', 'price', 'beds', 'baths',
      'area', 'city', 'community', 'address', 'lat', 'lng', 'image', 'video_url',
      'virtual_tour_url', 'floor_plan_url', 'amenities', 'featured'];

    foreach ($allowed as $field) {
      if (array_key_exists($field, $input)) {
        if ($field === 'amenities') {
          $fields[] = "{$field} = :{$field}";
          $updateParams[":{$field}"] = json_encode($input[$field]);
        } elseif (in_array($field, ['featured'])) {
          $fields[] = "{$field} = :{$field}";
          $updateParams[":{$field}"] = !empty($input[$field]) ? 1 : 0;
        } elseif (in_array($field, ['price', 'beds', 'baths', 'area'])) {
          $fields[] = "{$field} = :{$field}";
          $updateParams[":{$field}"] = (int)$input[$field];
        } elseif (in_array($field, ['lat', 'lng'])) {
          $fields[] = "{$field} = :{$field}";
          $updateParams[":{$field}"] = (float)$input[$field];
        } else {
          $fields[] = "{$field} = :{$field}";
          $updateParams[":{$field}"] = $input[$field];
        }
      }
    }

    if (isset($input['title'])) {
      $fields[] = 'slug = :slug';
      $updateParams[':slug'] = self::generateSlug($input['title'], $db, $id);
    }

    if (isset($input['status'])) {
      $fields[] = 'is_active = :is_active';
      $updateParams[':is_active'] = $input['status'] === 'published' ? 1 : ($input['status'] === 'archived' ? 2 : 0);
    }

    if (empty($fields)) {
      Response::error('No valid fields to update', 400);
    }

    $fields[] = 'updated_at = NOW()';
    $updateParams[':id'] = $id;

    $sql = "UPDATE properties SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $db->prepare($sql);
    $stmt->execute($updateParams);

    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'update_listing', 'property', $id, $_SERVER['REMOTE_ADDR'] ?? '']);

    $stmt = $db->prepare("SELECT p.* FROM properties p WHERE p.id = ?");
    $stmt->execute([$id]);
    $property = $stmt->fetch();

    $property['id'] = (int)$property['id'];
    $property['price'] = (int)$property['price'];
    $property['beds'] = (int)$property['beds'];
    $property['baths'] = (int)$property['baths'];
    $property['area'] = (int)$property['area'];
    $property['featured'] = (bool)$property['featured'];
    $property['is_verified'] = (bool)$property['is_verified'];
    $property['amenities'] = json_decode($property['amenities'] ?? '[]', true);

    Response::success($property, 'Listing updated successfully');
  }

  public static function destroy(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid listing ID', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT id FROM properties WHERE id = ? AND agent_id = ?");
    $stmt->execute([$id, $agentId]);

    if (!$stmt->fetch()) {
      Response::error('Listing not found or access denied', 404);
    }

    $stmt = $db->prepare('DELETE FROM properties WHERE id = ?');
    $stmt->execute([$id]);

    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'delete_listing', 'property', $id, $_SERVER['REMOTE_ADDR'] ?? '']);

    Response::success(null, 'Listing deleted successfully');
  }

  public static function updateStatus(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid listing ID', 400);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['status'])) {
      Response::error('Status is required', 400);
    }

    $validStatuses = ['draft', 'published', 'archived'];
    if (!in_array($input['status'], $validStatuses)) {
      Response::error('Invalid status. Must be: draft, published, archived', 422);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT id, is_active FROM properties WHERE id = ? AND agent_id = ?");
    $stmt->execute([$id, $agentId]);
    $existing = $stmt->fetch();

    if (!$existing) {
      Response::error('Listing not found or access denied', 404);
    }

    $isActive = $input['status'] === 'published' ? 1 : ($input['status'] === 'archived' ? 2 : 0);

    if ($input['status'] === 'published' && (int)$existing['is_active'] !== 1) {
      self::checkListingLimit((int)$user['id']);
    }

    $stmt = $db->prepare('UPDATE properties SET is_active = ?, updated_at = NOW() WHERE id = ?');
    $stmt->execute([$isActive, $id]);

    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)');
    $logStmt->execute([$user['id'], "{$input['status']}_listing", 'property', $id, $_SERVER['REMOTE_ADDR'] ?? '']);

    Response::success(['id' => $id, 'status' => $input['status']], "Listing {$input['status']} successfully");
  }

  public static function stats(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $db = Database::getConnection();

    $stmt = $db->prepare("SELECT COUNT(*) FROM properties WHERE agent_id = ? AND is_active = 1");
    $stmt->execute([$agentId]);
    $active = (int)$stmt->fetchColumn();

    $stmt = $db->prepare("SELECT COUNT(*) FROM properties WHERE agent_id = ? AND is_active = 0");
    $stmt->execute([$agentId]);
    $drafts = (int)$stmt->fetchColumn();

    $stmt = $db->prepare("SELECT COUNT(*) FROM properties WHERE agent_id = ? AND is_active = 2");
    $stmt->execute([$agentId]);
    $archived = (int)$stmt->fetchColumn();

    $stmt = $db->prepare(
      "SELECT COUNT(*) FROM inquiries i 
       JOIN properties p ON i.property_id = p.id 
       WHERE p.agent_id = ? AND i.is_read = 0"
    );
    $stmt->execute([$agentId]);
    $unreadLeads = (int)$stmt->fetchColumn();

    Response::success([
      'active_listings'  => $active,
      'draft_listings'   => $drafts,
      'archived_listings' => $archived,
      'unread_leads'     => $unreadLeads,
      'total'            => $active + $drafts + $archived,
    ], 'Stats retrieved successfully');
  }

  private static function generateSlug(string $title, PDO $db, ?int $excludeId = null): string
  {
    $slug = strtolower(trim($title));
    $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug);
    $slug = preg_replace('/[\s-]+/', '-', $slug);
    $slug = trim($slug, '-');

    $original = $slug;
    $counter = 1;

    while (true) {
      if ($excludeId) {
        $stmt = $db->prepare('SELECT COUNT(*) FROM properties WHERE slug = ? AND id != ?');
        $stmt->execute([$slug, $excludeId]);
      } else {
        $stmt = $db->prepare('SELECT COUNT(*) FROM properties WHERE slug = ?');
        $stmt->execute([$slug]);
      }
      if ((int)$stmt->fetchColumn() === 0) {
        break;
      }
      $slug = "{$original}-{$counter}";
      $counter++;
    }

    return $slug;
  }
}
