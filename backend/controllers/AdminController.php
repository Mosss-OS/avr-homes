<?php

declare(strict_types=1);

class AdminController
{
  // ─── Dashboard Stats ────────────────────────────────────────────────
  public static function stats(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $db = Database::getConnection();

    $totalProperties   = (int)$db->query("SELECT COUNT(*) FROM properties")->fetchColumn();
    $activeProperties  = (int)$db->query("SELECT COUNT(*) FROM properties WHERE is_active = 1")->fetchColumn();
    $totalAgents       = (int)$db->query("SELECT COUNT(*) FROM agents")->fetchColumn();
    $verifiedAgents    = (int)$db->query("SELECT COUNT(*) FROM agents WHERE is_verified = 1")->fetchColumn();
    $totalUsers        = (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $pendingVerifs     = (int)$db->query("SELECT COUNT(*) FROM property_verifications WHERE status = 'pending'")->fetchColumn();
    $totalBookings     = (int)$db->query("SELECT COUNT(*) FROM property_bookings")->fetchColumn();
    $pendingBookings   = (int)$db->query("SELECT COUNT(*) FROM property_bookings WHERE status = 'pending'")->fetchColumn();
    $totalInquiries    = (int)$db->query("SELECT COUNT(*) FROM inquiries")->fetchColumn();
    $unreadInquiries   = (int)$db->query("SELECT COUNT(*) FROM inquiries WHERE is_read = 0")->fetchColumn();
    $totalBlogPosts    = (int)$db->query("SELECT COUNT(*) FROM blog_posts")->fetchColumn();

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
