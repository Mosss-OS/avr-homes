<?php

declare(strict_types=1);

class AdminController
{
  // ─── Dashboard Stats ────────────────────────────────────────────────
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
    $totalBlogPosts    = $safeCount("SELECT COUNT(*) FROM blog_posts");

    Response::success([
      'properties'       => ['total' => $totalProperties, 'active' => $activeProperties],
      'agents'           => ['total' => $totalAgents, 'verified' => $verifiedAgents],
      'users'            => ['total' => $totalUsers],
      'verifications'    => ['pending' => $pendingVerifs],
      'bookings'         => ['total' => $totalBookings, 'pending' => $pendingBookings],
      'inquiries'        => ['total' => $totalInquiries, 'unread' => $unreadInquiries],
      'blog_posts'       => ['total' => $totalBlogPosts],
    ]);
  }

  // ─── Properties ─────────────────────────────────────────────────────
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

  // ─── Agents ─────────────────────────────────────────────────────────
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

  // ─── Users ───────────────────────────────────────────────────────────
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

  // ─── Bookings ────────────────────────────────────────────────────────
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
}
