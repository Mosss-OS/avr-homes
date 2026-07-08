<?php

declare(strict_types=1);

/**
 * AdminController
 *
 * Handles admin dashboard, property, agent, user, booking, activity,
 * and blog management endpoints.
 */
class AdminController
{
  // ─── Dashboard Stats ────────────────────────────────────────────────

  /**
   * Get dashboard statistics.
   *
   * Returns counts for properties, agents, users, verifications, bookings,
   * inquiries, and blog posts.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function stats(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $db = Database::getConnection();

    $safeCount = function (string $sql) use ($db): int {
      try { return (int)$db->query($sql)->fetchColumn(); }
      catch (\Throwable) { return 0; }
    };

    $totalProperties   = $safeCount("SELECT COUNT(*) FROM properties");
    $activeProperties  = $safeCount("SELECT COUNT(*) FROM properties WHERE is_active = 1");
    $totalAgents       = $safeCount("SELECT COUNT(*) FROM agents");
    $verifiedAgents    = $safeCount("SELECT COUNT(*) FROM agents WHERE is_verified = 1");
    $totalUsers        = $safeCount("SELECT COUNT(*) FROM users");
    $pendingVerifs     = $safeCount("SELECT COUNT(*) FROM property_verifications WHERE status = 'pending'");
    $totalBookings     = $safeCount("SELECT COUNT(*) FROM property_bookings");
    $pendingBookings   = $safeCount("SELECT COUNT(*) FROM property_bookings WHERE status = 'pending'");
    $totalInquiries    = $safeCount("SELECT COUNT(*) FROM inquiries");
    $unreadInquiries   = $safeCount("SELECT COUNT(*) FROM inquiries WHERE is_read = 0");
    $totalContacts     = $safeCount("SELECT COUNT(*) FROM contact_messages");
    $unreadContacts    = $safeCount("SELECT COUNT(*) FROM contact_messages WHERE is_read = 0");
    $totalBlogPosts    = $safeCount("SELECT COUNT(*) FROM blog_posts");
    $activeSubscriptions = $safeCount("SELECT COUNT(DISTINCT s.agent_id) FROM agent_subscriptions s WHERE s.status = 'active'");
    $revenueMRR          = $safeCount("SELECT COALESCE(SUM(
      CASE s.tier
        WHEN 'bronze' THEN 5000 WHEN 'silver' THEN 15000
        WHEN 'gold' THEN 50000 WHEN 'platinum' THEN 150000
        ELSE 0
      END), 0) FROM agent_subscriptions s WHERE s.status = 'active'");

    Response::success([
      'properties'       => ['total' => $totalProperties, 'active' => $activeProperties],
      'agents'           => ['total' => $totalAgents, 'verified' => $verifiedAgents],
      'users'            => ['total' => $totalUsers],
      'verifications'    => ['pending' => $pendingVerifs],
      'bookings'         => ['total' => $totalBookings, 'pending' => $pendingBookings],
      'inquiries'        => ['total' => $totalInquiries, 'unread' => $unreadInquiries],
      'contact_messages' => ['total' => $totalContacts, 'unread' => $unreadContacts],
      'blog_posts'       => ['total' => $totalBlogPosts],
      'subscriptions'    => ['active' => $activeSubscriptions, 'mrr' => $revenueMRR],
    ]);
  }

  // ─── Properties ─────────────────────────────────────────────────────

  /**
   * List properties with pagination, filtering, and search.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function properties(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $page     = max(1, (int)($_GET['page'] ?? 1));
    $perPage  = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $status   = $_GET['status'] ?? null;
    $purpose  = $_GET['purpose'] ?? null;
    $search   = $_GET['q'] ?? null;

    $db = Database::getConnection();
    $conditions = ['1=1'];
    $binds = [];

    if ($status === 'active') { $conditions[] = 'p.is_active = 1'; }
    elseif ($status === 'draft') { $conditions[] = 'p.is_active = 0'; }
    elseif ($status === 'archived') { $conditions[] = 'p.is_active = 2'; }

    if ($purpose) { $conditions[] = 'p.purpose = ?'; $binds[] = $purpose; }
    if ($search) { $conditions[] = '(p.title LIKE ? OR p.city LIKE ? OR p.community LIKE ?)'; $binds[] = "%{$search}%"; $binds[] = "%{$search}%"; $binds[] = "%{$search}%"; }

    $where = implode(' AND ', $conditions);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM properties p WHERE {$where}");
    $countStmt->execute($binds);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT p.*, a.name as agent_name, a.agency as agent_agency
       FROM properties p
       LEFT JOIN agents a ON p.agent_id = a.id
       WHERE {$where}
       ORDER BY p.created_at DESC LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($binds);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
      $r['id'] = (int)$r['id'];
      $r['price'] = (int)$r['price'];
      $r['beds'] = (int)$r['beds'];
      $r['baths'] = (int)$r['baths'];
      $r['area'] = (int)$r['area'];
      $r['featured'] = (bool)$r['featured'];
      $r['is_verified'] = (bool)$r['is_verified'];
      $r['amenities'] = json_decode($r['amenities'] ?? '[]', true);
    }

    Response::success([
      'data' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  /**
   * Create a new property.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function createProperty(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $input = $_POST;
    $validator = new Validator($input);
    $validator
      ->required('title', 'Title')
      ->required('description', 'Description')
      ->required('price', 'Price');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $db = Database::getConnection();

    $imageUrl = null;
    if (!empty($_FILES['image']['tmp_name'])) {
      $uploads = __DIR__ . '/../public/uploads/properties';
      if (!is_dir($uploads)) mkdir($uploads, 0755, true);
      $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
      $filename = 'prop_' . uniqid() . '.' . $ext;
      if (move_uploaded_file($_FILES['image']['tmp_name'], "$uploads/$filename")) {
        $imageUrl = '/uploads/properties/' . $filename;
      }
    }

    $amenities = !empty($input['amenities']) ? json_encode(json_decode($input['amenities'], true) ?: []) : '[]';

    $stmt = $db->prepare('
      INSERT INTO properties (title, description, type, purpose, price, beds, baths, area, amenities,
        city, community, address, lat, lng, image, video_url, virtual_tour_url, floor_plan_url, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ');
    $stmt->execute([
      $data['title'], $data['description'], $input['type'] ?? 'apartment', $input['purpose'] ?? 'buy',
      (int)$data['price'], (int)($input['beds'] ?? 0), (int)($input['baths'] ?? 0), (float)($input['area'] ?? 0),
      $amenities, $input['city'] ?? '', $input['community'] ?? '', $input['address'] ?? '',
      (float)($input['lat'] ?? 0), (float)($input['lng'] ?? 0), $imageUrl,
      $input['video_url'] ?? '', $input['virtual_tour_url'] ?? '', $input['floor_plan_url'] ?? '',
      ($input['status'] ?? 'published') === 'published' ? 1 : 0,
    ]);

    $newId = (int)$db->lastInsertId();
    Response::success(['id' => $newId], 'Property created successfully', 201);
  }

  /**
   * Update property status (draft / published / archived).
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function updatePropertyStatus(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid property ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    $status = $input['status'] ?? null;

    if (!in_array($status, ['draft', 'published', 'archived'])) {
      Response::error('Invalid status. Use: draft, published, archived', 422);
    }

    $isActive = $status === 'published' ? 1 : ($status === 'archived' ? 2 : 0);
    $db = Database::getConnection();
    $stmt = $db->prepare('UPDATE properties SET is_active = ?, updated_at = NOW() WHERE id = ?');
    $stmt->execute([$isActive, $id]);

    Response::success(['id' => $id, 'status' => $status], 'Property status updated');
  }

  /**
   * Toggle the featured flag on a property.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function toggleFeature(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid property ID', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT featured FROM properties WHERE id = ?');
    $stmt->execute([$id]);
    $current = $stmt->fetch();

    if (!$current) Response::error('Property not found', 404);

    $new = (int)$current['featured'] ? 0 : 1;
    $stmt = $db->prepare('UPDATE properties SET featured = ?, updated_at = NOW() WHERE id = ?');
    $stmt->execute([$new, $id]);

    Response::success(['id' => $id, 'featured' => (bool)$new], 'Property featured status toggled');
  }

  /**
   * Toggle the verified flag on a property.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function verifyProperty(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid property ID', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT is_verified FROM properties WHERE id = ?');
    $stmt->execute([$id]);
    $current = $stmt->fetch();

    if (!$current) Response::error('Property not found', 404);

    $new = (int)$current['is_verified'] ? 0 : 1;
    $stmt = $db->prepare('UPDATE properties SET is_verified = ?, verified_at = NOW(), updated_at = NOW() WHERE id = ?');
    $stmt->execute([$new, $id]);

    Response::success(['id' => $id, 'is_verified' => (bool)$new], 'Property verification toggled');
  }

  /**
   * Delete a property.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function deleteProperty(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid property ID', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare('DELETE FROM properties WHERE id = ?');
    $stmt->execute([$id]);

    Response::success(null, 'Property deleted');
  }

  /**
   * Get a single property by ID.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function getProperty(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid property ID', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT * FROM properties WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) Response::error('Property not found', 404);

    $row['amenities'] = json_decode($row['amenities'] ?? '[]', true);
    $row['featured'] = (bool)$row['featured'];
    $row['is_verified'] = (bool)$row['is_verified'];
    $row['is_active'] = (int)$row['is_active'];

    Response::success(['property' => $row]);
  }

  /**
   * Update a property's editable fields.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function updateProperty(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid property ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) Response::error('No data provided', 400);

    $db = Database::getConnection();

    $fields = [];
    $binds = [];
    foreach (['title','description','type','purpose','price','beds','baths','area','city','community','address','lat','lng','video_url','virtual_tour_url','floor_plan_url'] as $f) {
      if (array_key_exists($f, $input)) {
        $fields[] = "$f = ?";
        $binds[] = $input[$f];
      }
    }
    if (array_key_exists('amenities', $input)) {
      $fields[] = "amenities = ?";
      $binds[] = json_encode($input['amenities']);
    }
    if (array_key_exists('status', $input)) {
      $fields[] = "is_active = ?";
      $binds[] = $input['status'] === 'published' ? 1 : ($input['status'] === 'archived' ? 2 : 0);
    }

    if (empty($fields)) Response::error('No fields to update', 400);

    $fields[] = "updated_at = NOW()";
    $binds[] = $id;

    $sql = "UPDATE properties SET " . implode(', ', $fields) . " WHERE id = ?";
    $db->prepare($sql)->execute($binds);

    Response::success(['id' => $id], 'Property updated');
  }

  // ─── Agents ─────────────────────────────────────────────────────────

  /**
   * List agents with pagination and search.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function agents(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $search  = $_GET['q'] ?? null;

    $db = Database::getConnection();
    $conditions = ['1=1'];
    $binds = [];

    if ($search) { $conditions[] = '(a.name LIKE ? OR a.email LIKE ? OR a.agency LIKE ?)'; $binds[] = "%{$search}%"; $binds[] = "%{$search}%"; $binds[] = "%{$search}%"; }

    $where = implode(' AND ', $conditions);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM agents a WHERE {$where}");
    $countStmt->execute($binds);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT a.*, u.email as user_email, u.is_active as user_is_active, u.role
       FROM agents a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE {$where}
       ORDER BY a.created_at DESC LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($binds);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
      $r['id'] = (int)$r['id'];
      $r['listings'] = (int)$r['listings'];
      $r['is_verified'] = (bool)$r['is_verified'];
      $r['languages'] = json_decode($r['languages'] ?? '[]', true);
    }

    Response::success([
      'data' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  /**
   * Update agent active / inactive status.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function updateAgentStatus(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid agent ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    $isActive = !empty($input['is_active']) ? 1 : 0;

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT user_id FROM agents WHERE id = ?');
    $stmt->execute([$id]);
    $agent = $stmt->fetch();
    if (!$agent) Response::error('Agent not found', 404);

    $db->prepare('UPDATE agents SET is_active = ? WHERE id = ?')->execute([$isActive, $id]);
    $db->prepare('UPDATE users SET is_active = ? WHERE id = ?')->execute([$isActive, $agent['user_id']]);

    Response::success(['id' => $id, 'is_active' => (bool)$isActive], 'Agent status updated');
  }

  /**
   * Toggle agent verified status.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function toggleAgentVerify(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid agent ID', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT is_verified FROM agents WHERE id = ?');
    $stmt->execute([$id]);
    $current = $stmt->fetch();
    if (!$current) Response::error('Agent not found', 404);

    $new = (int)$current['is_verified'] ? 0 : 1;
    $db->prepare('UPDATE agents SET is_verified = ? WHERE id = ?')->execute([$new, $id]);

    Response::success(['id' => $id, 'is_verified' => (bool)$new], 'Agent verification toggled');
  }

  /**
   * Delete an agent and reassign their properties.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function deleteAgent(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid agent ID', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT user_id FROM agents WHERE id = ?');
    $stmt->execute([$id]);
    $agent = $stmt->fetch();
    if (!$agent) Response::error('Agent not found', 404);

    $db->beginTransaction();
    $db->prepare('UPDATE properties SET agent_id = NULL WHERE agent_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM agents WHERE id = ?')->execute([$id]);
    $db->prepare('UPDATE users SET role = ? WHERE id = ? AND role = ?')->execute(['user', $agent['user_id'], 'agent']);
    $db->commit();

    Response::success(null, 'Agent deleted');
  }

  /**
   * Get a single agent by ID.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function getAgent(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid agent ID', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT a.*, u.email as user_email FROM agents a LEFT JOIN users u ON a.user_id = u.id WHERE a.id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) Response::error('Agent not found', 404);

    $row['id'] = (int)$row['id'];
    $row['is_verified'] = (bool)$row['is_verified'];
    $row['languages'] = json_decode($row['languages'] ?? '[]', true);
    $row['property_types'] = json_decode($row['property_types'] ?? '[]', true);
    $row['specialization'] = json_decode($row['specialization'] ?? '[]', true);

    Response::success(['agent' => $row]);
  }

  /**
   * Update an agent's profile fields.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function updateAgent(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid agent ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) Response::error('No data provided', 400);

    $db = Database::getConnection();
    $fields = [];
    $binds = [];

    foreach (['name','email','phone','agency','bio','whatsapp','experience','state','city','avg_monthly_listings','avg_deal_size','referral_source','social_instagram','social_facebook','social_linkedin','social_tiktok','social_youtube'] as $f) {
      if (array_key_exists($f, $input)) {
        $fields[] = "$f = ?";
        $binds[] = $input[$f];
      }
    }
    foreach (['property_types','specialization','languages','support_needed'] as $f) {
      if (array_key_exists($f, $input)) {
        $fields[] = "$f = ?";
        $binds[] = json_encode($input[$f]);
      }
    }

    if (empty($fields)) Response::error('No fields to update', 400);

    $binds[] = $id;
    $sql = "UPDATE agents SET " . implode(', ', $fields) . " WHERE id = ?";
    $db->prepare($sql)->execute($binds);

    Response::success(['id' => $id], 'Agent updated');
  }

  // ─── Users ───────────────────────────────────────────────────────────

  /**
   * List users with pagination and search.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function users(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $search  = $_GET['q'] ?? null;

    $db = Database::getConnection();
    $conditions = ['1=1'];
    $binds = [];

    if ($search) { $conditions[] = '(name LIKE ? OR email LIKE ?)'; $binds[] = "%{$search}%"; $binds[] = "%{$search}%"; }

    $where = implode(' AND ', $conditions);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM users WHERE {$where}");
    $countStmt->execute($binds);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare("SELECT id, name, email, role, is_active, email_verified_at, created_at FROM users WHERE {$where} ORDER BY created_at DESC LIMIT {$perPage} OFFSET {$offset}");
    $stmt->execute($binds);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
      $r['id'] = (int)$r['id'];
      $r['is_active'] = (bool)$r['is_active'];
    }

    Response::success([
      'data' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  /**
   * Update a user's role.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function updateUserRole(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid user ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    $role = $input['role'] ?? null;

    if (!in_array($role, ['user', 'agent', 'admin'])) {
      Response::error('Invalid role. Use: user, agent, admin', 422);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare('UPDATE users SET role = ? WHERE id = ?');
    $stmt->execute([$role, $id]);

    Response::success(['id' => $id, 'role' => $role], 'User role updated');
  }

  /**
   * Get a single user by ID.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function getUser(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid user ID', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT id, name, email, role, is_active, email_verified_at, created_at, updated_at FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) Response::error('User not found', 404);

    $row['id'] = (int)$row['id'];
    $row['is_active'] = (bool)$row['is_active'];

    Response::success(['user' => $row]);
  }

  /**
   * Update a user's name, email, or active status.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function updateUser(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid user ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) Response::error('No data provided', 400);

    $db = Database::getConnection();
    $fields = [];
    $binds = [];

    foreach (['name', 'email'] as $f) {
      if (array_key_exists($f, $input)) {
        $fields[] = "$f = ?";
        $binds[] = $input[$f];
      }
    }
    if (array_key_exists('is_active', $input)) {
      $fields[] = "is_active = ?";
      $binds[] = $input['is_active'] ? 1 : 0;
    }

    if (empty($fields)) Response::error('No fields to update', 400);

    $binds[] = $id;
    $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
    $db->prepare($sql)->execute($binds);

    Response::success(['id' => $id], 'User updated');
  }

  // ─── Bookings ────────────────────────────────────────────────────────

  /**
   * List bookings with pagination and status filter.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function bookings(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $status  = $_GET['status'] ?? null;

    $db = Database::getConnection();
    $conditions = ['1=1'];
    $binds = [];

    if ($status) { $conditions[] = 'b.status = ?'; $binds[] = $status; }

    $where = implode(' AND ', $conditions);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM property_bookings b WHERE {$where}");
    $countStmt->execute($binds);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT b.*, p.title as property_title, p.slug as property_slug
       FROM property_bookings b
       LEFT JOIN properties p ON b.property_id = p.id
       WHERE {$where}
       ORDER BY b.created_at DESC LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($binds);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
      $r['id'] = (int)$r['id'];
      $r['property_id'] = (int)$r['property_id'];
      $r['guests'] = (int)$r['guests'];
      $r['total_price'] = (int)$r['total_price'];
    }

    Response::success([
      'data' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  /**
   * Update a booking's status (confirmed / cancelled / completed).
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function updateBookingStatus(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid booking ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    $status = $input['status'] ?? null;

    if (!in_array($status, ['confirmed', 'cancelled', 'completed'])) {
      Response::error('Invalid status. Use: confirmed, cancelled, completed', 422);
    }

    $db = Database::getConnection();
    $db->prepare('UPDATE property_bookings SET status = ? WHERE id = ?')->execute([$status, $id]);

    Response::success(['id' => $id, 'status' => $status], 'Booking status updated');
  }

  // ─── Activity Log ────────────────────────────────────────────────────

  /**
   * List activity logs with pagination.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function activity(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 30)));

    $db = Database::getConnection();
    $offset = ($page - 1) * $perPage;

    $total = (int)$db->query("SELECT COUNT(*) FROM activity_logs")->fetchColumn();

    $stmt = $db->prepare(
      "SELECT l.*, u.name as user_name, u.email as user_email
       FROM activity_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute();
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
      $r['user_id'] = $r['user_id'] ? (int)$r['user_id'] : null;
    }

    Response::success([
      'data' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  // ─── Blog ────────────────────────────────────────────────────────────

  /**
   * List blog posts with pagination and search.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function blogPosts(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $search  = $_GET['q'] ?? null;

    $db = Database::getConnection();
    $conditions = ['1=1'];
    $binds = [];

    if ($search) { $conditions[] = '(p.title LIKE ?)'; $binds[] = "%{$search}%"; }

    $where = implode(' AND ', $conditions);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM blog_posts p WHERE {$where}");
    $countStmt->execute($binds);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT p.*, c.name as category_name, u.name as author_name
       FROM blog_posts p
       LEFT JOIN blog_categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.author_id = u.id
       WHERE {$where}
       ORDER BY p.created_at DESC LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($binds);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
      $r['id'] = (int)$r['id'];
      $r['category_id'] = (int)$r['category_id'];
      $r['is_published'] = (bool)$r['is_published'];
    }

    Response::success([
      'data' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  // ─── Inquiries ────────────────────────────────────────────────────────

  /**
   * List property inquiries with pagination, status filter, and search.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function inquiries(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $status  = $_GET['status'] ?? null;
    $search  = $_GET['q'] ?? null;

    $db = Database::getConnection();
    $conditions = ['1=1'];
    $binds = [];

    if ($status === 'unread') { $conditions[] = 'i.is_read = 0'; }
    elseif ($status) { $conditions[] = 'i.status = ?'; $binds[] = $status; }
    if ($search) { $conditions[] = '(i.name LIKE ? OR i.email LIKE ? OR i.phone LIKE ?)'; $binds[] = "%{$search}%"; $binds[] = "%{$search}%"; $binds[] = "%{$search}%"; }

    $where = implode(' AND ', $conditions);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM inquiries i WHERE {$where}");
    $countStmt->execute($binds);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT i.*, p.title as property_title, p.slug as property_slug,
              a.name as assigned_agent_name, a.id as assigned_agent_id
       FROM inquiries i
       LEFT JOIN properties p ON i.property_id = p.id
       LEFT JOIN agents a ON i.assigned_to = a.id
       WHERE {$where}
       ORDER BY i.created_at DESC LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($binds);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
      $r['id'] = (int)$r['id'];
      $r['property_id'] = $r['property_id'] ? (int)$r['property_id'] : null;
      $r['is_read'] = (bool)$r['is_read'];
    }

    Response::success([
      'data' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  /**
   * Mark an inquiry as read.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function updateInquiryRead(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid inquiry ID', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare('UPDATE inquiries SET is_read = 1 WHERE id = ?');
    $stmt->execute([$id]);

    Response::success(['id' => $id], 'Inquiry marked as read');
  }

  /**
   * Update inquiry status (new / contacted / qualified / closed).
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function updateInquiryStatus(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid inquiry ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    $status = $input['status'] ?? null;

    if (!in_array($status, ['new', 'contacted', 'qualified', 'closed'])) {
      Response::error('Invalid status. Use: new, contacted, qualified, closed', 422);
    }

    $db = Database::getConnection();
    $db->prepare('UPDATE inquiries SET status = ? WHERE id = ?')->execute([$status, $id]);

    Response::success(['id' => $id, 'status' => $status], 'Inquiry status updated');
  }

  /**
   * Update inquiry notes.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function updateInquiryNotes(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid inquiry ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    $notes = $input['notes'] ?? '';

    $db = Database::getConnection();
    $db->prepare('UPDATE inquiries SET notes = ? WHERE id = ?')->execute([$notes, $id]);

    Response::success(['id' => $id], 'Inquiry notes updated');
  }

  /**
   * Assign an inquiry to an agent.
   */
  public static function assignInquiry(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid inquiry ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    $assignedTo = isset($input['assigned_to']) ? (int)$input['assigned_to'] : null;

    $db = Database::getConnection();
    $db->prepare('UPDATE inquiries SET assigned_to = ? WHERE id = ?')->execute([$assignedTo, $id]);

    Response::success(['id' => $id], 'Inquiry assigned');
  }

  /**
   * Delete an inquiry.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function deleteInquiry(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid inquiry ID', 400);

    $db = Database::getConnection();
    $db->prepare('DELETE FROM inquiries WHERE id = ?')->execute([$id]);

    Response::success(null, 'Inquiry deleted');
  }

  // ─── Contact Messages ─────────────────────────────────────────────────

  /**
   * List contact messages with pagination, status filter, and search.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function contactMessages(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $unread  = $_GET['unread'] ?? null;
    $search  = $_GET['q'] ?? null;

    $db = Database::getConnection();
    $conditions = ['1=1'];
    $binds = [];

    if ($unread === '1') { $conditions[] = 'cm.is_read = 0'; }
    if ($search) { $conditions[] = '(cm.name LIKE ? OR cm.email LIKE ? OR cm.phone LIKE ?)'; $binds[] = "%{$search}%"; $binds[] = "%{$search}%"; $binds[] = "%{$search}%"; }

    $where = implode(' AND ', $conditions);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM contact_messages cm WHERE {$where}");
    $countStmt->execute($binds);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT cm.*
       FROM contact_messages cm
       WHERE {$where}
       ORDER BY cm.created_at DESC LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($binds);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
      $r['id'] = (int)$r['id'];
      $r['is_read'] = (bool)$r['is_read'];
    }

    Response::success([
      'data' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  /**
   * Mark a contact message as read.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function updateContactMessageRead(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid contact message ID', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare('UPDATE contact_messages SET is_read = 1 WHERE id = ?');
    $stmt->execute([$id]);

    Response::success(['id' => $id], 'Contact message marked as read');
  }

  /**
   * Delete a contact message.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function deleteContactMessage(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid contact message ID', 400);

    $db = Database::getConnection();
    $db->prepare('DELETE FROM contact_messages WHERE id = ?')->execute([$id]);

    Response::success(null, 'Contact message deleted');
  }

  /**
   * [Admin] Trend data for charts.
   * GET /api/admin/analytics/trends?period=30
   */
  public static function trends(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $period = max(7, min(365, (int)($_GET['period'] ?? 30)));
    $db = Database::getConnection();

    $since = date('Y-m-d', strtotime("-{$period} days"));

    $trends = $db->query(
      "SELECT
         d.date,
         COALESCE(u.cnt, 0) as new_users,
         COALESCE(p.cnt, 0) as new_properties,
         COALESCE(b.cnt, 0) as new_bookings,
         COALESCE(i.cnt, 0) as new_inquiries,
         COALESCE(r.cnt, 0) as new_referrals,
         COALESCE(s.cnt, 0) as new_subscriptions
       FROM (
         SELECT DATE_ADD('{$since}', INTERVAL seq DAY) as date
         FROM (SELECT 0 as seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) d1
         CROSS JOIN (SELECT 0 as seq UNION SELECT 10 UNION SELECT 20 UNION SELECT 30 UNION SELECT 40 UNION SELECT 50 UNION SELECT 60 UNION SELECT 70 UNION SELECT 80 UNION SELECT 90) d2
         HAVING date <= CURDATE()
       ) d
       LEFT JOIN (SELECT DATE(created_at) as dt, COUNT(*) as cnt FROM users WHERE created_at >= ? GROUP BY dt) u ON u.dt = d.date
       LEFT JOIN (SELECT DATE(created_at) as dt, COUNT(*) as cnt FROM properties WHERE created_at >= ? GROUP BY dt) p ON p.dt = d.date
       LEFT JOIN (SELECT DATE(created_at) as dt, COUNT(*) as cnt FROM property_bookings WHERE created_at >= ? GROUP BY dt) b ON b.dt = d.date
       LEFT JOIN (SELECT DATE(created_at) as dt, COUNT(*) as cnt FROM inquiries WHERE created_at >= ? GROUP BY dt) i ON i.dt = d.date
       LEFT JOIN (SELECT DATE(created_at) as dt, COUNT(*) as cnt FROM referrals WHERE created_at >= ? GROUP BY dt) r ON r.dt = d.date
       LEFT JOIN (SELECT DATE(created_at) as dt, COUNT(*) as cnt FROM agent_subscriptions WHERE created_at >= ? GROUP BY dt) s ON s.dt = d.date
       ORDER BY d.date"
    )->fetchAll();

    Response::success(['period' => $period, 'data' => $trends], 'Trends retrieved');
  }

  /**
   * [Admin] Breakdown stats.
   * GET /api/admin/analytics/breakdown
   */
  public static function breakdown(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $db = Database::getConnection();

    $propertiesByType = $db->query("SELECT type, COUNT(*) as count FROM properties GROUP BY type ORDER BY count DESC")->fetchAll();
    $propertiesByPurpose = $db->query("SELECT purpose, COUNT(*) as count FROM properties GROUP BY purpose ORDER BY count DESC")->fetchAll();
    $propertiesByCity = $db->query("SELECT city, COUNT(*) as count FROM properties GROUP BY city ORDER BY count DESC LIMIT 10")->fetchAll();
    $subscriptionsByTier = $db->query("SELECT tier, COUNT(*) as count FROM agent_subscriptions WHERE status = 'active' GROUP BY tier ORDER BY count DESC")->fetchAll();
    $bookingsByStatus = $db->query("SELECT status, COUNT(*) as count FROM property_bookings GROUP BY status")->fetchAll();
    $inquiriesByStatus = $db->query("SELECT status, COUNT(*) as count FROM inquiries GROUP BY status")->fetchAll();

    foreach ([&$propertiesByType, &$propertiesByPurpose, &$propertiesByCity, &$subscriptionsByTier, &$bookingsByStatus, &$inquiriesByStatus] as &$arr) {
      foreach ($arr as &$r) { $r['count'] = (int)$r['count']; }
    }

    Response::success([
      'properties_by_type' => $propertiesByType,
      'properties_by_purpose' => $propertiesByPurpose,
      'properties_by_city' => $propertiesByCity,
      'subscriptions_by_tier' => $subscriptionsByTier,
      'bookings_by_status' => $bookingsByStatus,
      'inquiries_by_status' => $inquiriesByStatus,
    ], 'Breakdown retrieved');
  }

  /**
   * [Admin] Unified moderation queue.
   * GET /api/admin/moderation
   */
  public static function moderation(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $db = Database::getConnection();

    $pendingVerifications = $db->query(
      "SELECT pv.*, p.title as property_title, a.name as agent_name
       FROM property_verifications pv
       LEFT JOIN properties p ON p.id = pv.property_id
       LEFT JOIN agents a ON a.id = pv.agent_id
       WHERE pv.status = 'pending'
       ORDER BY pv.created_at DESC LIMIT 50"
    )->fetchAll();

    $unpublishedProperties = $db->query(
      "SELECT id, title, purpose, is_active, created_at FROM properties WHERE is_active = 0 ORDER BY created_at DESC LIMIT 50"
    )->fetchAll();

    $unverifiedAgents = $db->query(
      "SELECT a.id, a.name, a.email, a.agency, a.created_at
       FROM agents a WHERE a.is_verified = 0 AND a.is_active = 1 ORDER BY a.created_at DESC LIMIT 50"
    )->fetchAll();

    $pendingBlogPosts = $db->query(
      "SELECT id, title, status, created_at FROM blog_posts WHERE status = 'draft' ORDER BY created_at DESC LIMIT 50"
    )->fetchAll();

    foreach ($pendingVerifications as &$v) {
      $v['id'] = (int)$v['id'];
      $v['property_id'] = (int)$v['property_id'];
      $v['agent_id'] = (int)$v['agent_id'];
    }

    foreach (['unpublishedProperties', 'unverifiedAgents', 'pendingBlogPosts'] as $key) {
      foreach (${$key} as &$item) {
        if (isset($item['id'])) $item['id'] = (int)$item['id'];
      }
    }

    Response::success([
      'pending_verifications' => $pendingVerifications,
      'unpublished_properties' => $unpublishedProperties,
      'unverified_agents' => $unverifiedAgents,
      'pending_blog_posts' => $pendingBlogPosts,
    ], 'Moderation queue retrieved');
  }

  /* ── Gallery ──────────────────────────────────────────────── */

  /**
   * List images for a property.
   */
  public static function propertyImages(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Property ID required', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT pi.*, p.image as hero_image FROM property_images pi LEFT JOIN properties p ON p.id = pi.property_id WHERE pi.property_id = ? ORDER BY pi.sort_order ASC, pi.id ASC");
    $stmt->execute([$id]);
    $images = $stmt->fetchAll();

    foreach ($images as &$img) {
      $img['id'] = (int)$img['id'];
      $img['property_id'] = (int)$img['property_id'];
      $img['is_primary'] = (bool)$img['is_primary'];
      $img['sort_order'] = (int)$img['sort_order'];
      $img['file_size'] = (int)$img['file_size'];
    }

    Response::success($images, 'Images retrieved');
  }

  /**
   * Upload gallery images for a property.
   */
  public static function uploadGallery(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $propertyId = (int)($_POST['property_id'] ?? 0);
    if (!$propertyId) Response::error('Property ID required', 400);

    $db = Database::getConnection();

    // Get current max sort order
    $stmt = $db->prepare("SELECT COALESCE(MAX(sort_order), 0) FROM property_images WHERE property_id = ?");
    $stmt->execute([$propertyId]);
    $sortOrder = (int)$stmt->fetchColumn();

    $uploadsDir = __DIR__ . '/../public/uploads/properties';
    if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);

    $uploaded = 0;
    $insertStmt = $db->prepare("INSERT INTO property_images (property_id, file_path, file_name, file_size, mime_type, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)");

    foreach ($_FILES['files']['tmp_name'] as $i => $tmpName) {
      if (empty($tmpName) || $_FILES['files']['error'][$i] !== UPLOAD_ERR_OK) continue;

      $ext = pathinfo($_FILES['files']['name'][$i], PATHINFO_EXTENSION);
      $filename = 'prop_' . $propertyId . '_' . uniqid() . '.' . $ext;
      $filePath = '/uploads/properties/' . $filename;

      if (move_uploaded_file($tmpName, "$uploadsDir/$filename")) {
        $sortOrder++;
        $isPrimary = 0;
        // Set as primary if no primary exists
        $check = $db->prepare("SELECT COUNT(*) FROM property_images WHERE property_id = ? AND is_primary = 1");
        $check->execute([$propertyId]);
        if ((int)$check->fetchColumn() === 0) $isPrimary = 1;

        $insertStmt->execute([
          $propertyId, $filePath, $_FILES['files']['name'][$i],
          filesize("$uploadsDir/$filename"), $_FILES['files']['type'][$i] ?? 'image/jpeg',
          $sortOrder, $isPrimary,
        ]);
        $uploaded++;
      }
    }

    Response::success(['uploaded' => $uploaded], "{$uploaded} image(s) uploaded");
  }

  /**
   * Set an image as primary.
   */
  public static function setPrimaryImage(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Image ID required', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT property_id FROM property_images WHERE id = ?");
    $stmt->execute([$id]);
    $img = $stmt->fetch();
    if (!$img) Response::error('Image not found', 404);

    $db->prepare("UPDATE property_images SET is_primary = 0 WHERE property_id = ?")->execute([$img['property_id']]);
    $db->prepare("UPDATE property_images SET is_primary = 1 WHERE id = ?")->execute([$id]);

    Response::success([], 'Primary image updated');
  }

  /**
   * Reorder two images.
   */
  public static function reorderImages(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $input = json_decode(file_get_contents('php://input'), true);
    $imageId = (int)($input['image_id'] ?? 0);
    $swapId = (int)($input['swap_id'] ?? 0);
    if (!$imageId || !$swapId) Response::error('image_id and swap_id required', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT sort_order FROM property_images WHERE id = ?");
    $stmt->execute([$imageId]); $order1 = $stmt->fetchColumn();
    $stmt->execute([$swapId]); $order2 = $stmt->fetchColumn();

    $db->prepare("UPDATE property_images SET sort_order = ? WHERE id = ?")->execute([$order2, $imageId]);
    $db->prepare("UPDATE property_images SET sort_order = ? WHERE id = ?")->execute([$order1, $swapId]);

    Response::success([], 'Images reordered');
  }

  /**
   * Delete an image.
   */
  public static function deleteImage(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Image ID required', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT * FROM property_images WHERE id = ?");
    $stmt->execute([$id]);
    $img = $stmt->fetch();
    if (!$img) Response::error('Image not found', 404);

    $filePath = __DIR__ . '/../public' . $img['file_path'];
    if (file_exists($filePath)) unlink($filePath);

    $db->prepare("DELETE FROM property_images WHERE id = ?")->execute([$id]);

    if ($img['is_primary']) {
      $db->prepare("UPDATE properties SET image = NULL WHERE id = ?")->execute([$img['property_id']]);
    }

    Response::success([], 'Image deleted');
  }
}
