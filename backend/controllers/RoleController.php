<?php

declare(strict_types=1);

class RoleController
{
  /* ── Roles CRUD ────────────────────────────────────────── */

  public static function adminRoles(): void
  {
    AuthMiddleware::authenticateAgent();
    $db = Database::getConnection();

    $roles = $db->query(
      "SELECT r.*,
        (SELECT COUNT(*) FROM admin_role_permissions WHERE role_id = r.id) as permission_count,
        (SELECT COUNT(*) FROM users WHERE admin_role_id = r.id) as user_count
       FROM admin_roles r ORDER BY r.is_system DESC, r.id ASC"
    )->fetchAll();

    foreach ($roles as &$r) {
      $r['id'] = (int)$r['id'];
      $r['is_system'] = (bool)$r['is_system'];
      $r['permission_count'] = (int)$r['permission_count'];
      $r['user_count'] = (int)$r['user_count'];
    }

    Response::success($roles, 'Roles retrieved');
  }

  public static function adminRoleDetail(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $id = (int)($params['id'] ?? 0);
    $db = Database::getConnection();

    $stmt = $db->prepare("SELECT * FROM admin_roles WHERE id = ?");
    $stmt->execute([$id]);
    $role = $stmt->fetch();
    if (!$role) { Response::error('Role not found', 404); return; }

    $role['is_system'] = (bool)$role['is_system'];

    $permStmt = $db->prepare(
      "SELECT p.* FROM admin_permissions p
       INNER JOIN admin_role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ? ORDER BY p.permission_group, p.id"
    );
    $permStmt->execute([$id]);
    $permissions = $permStmt->fetchAll();
    foreach ($permissions as &$p) { $p['id'] = (int)$p['id']; }

    $role['permissions'] = $permissions;
    Response::success($role, 'Role detail retrieved');
  }

  public static function adminCreateRole(): void
  {
    AuthMiddleware::authenticateAgent();
    $input = json_decode(file_get_contents('php://input'), true);
    if (empty($input['name']) || empty($input['slug'])) {
      Response::error('Name and slug are required', 400); return;
    }

    $db = Database::getConnection();
    $slug = strtolower(trim(preg_replace('/[^a-z0-9-]+/', '-', $input['slug'])));
    $stmt = $db->prepare("INSERT INTO admin_roles (name, slug, description) VALUES (?, ?, ?)");
    $stmt->execute([$input['name'], $slug, $input['description'] ?? '']);
    Response::success(['id' => (int)$db->lastInsertId()], 'Role created', 201);
  }

  public static function adminUpdateRole(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $id = (int)($params['id'] ?? 0);
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$id) { Response::error('Role ID required', 400); return; }

    $db = Database::getConnection();
    $fields = []; $binds = [];
    if (isset($input['name'])) { $fields[] = 'name = ?'; $binds[] = $input['name']; }
    if (isset($input['description'])) { $fields[] = 'description = ?'; $binds[] = $input['description']; }
    if (empty($fields)) { Response::error('No fields to update', 400); return; }
    $binds[] = $id;

    $db->prepare("UPDATE admin_roles SET " . implode(', ', $fields) . " WHERE id = ?")->execute($binds);
    Response::success([], 'Role updated');
  }

  public static function adminDeleteRole(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $id = (int)($params['id'] ?? 0);
    if (!$id) { Response::error('Role ID required', 400); return; }

    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT is_system FROM admin_roles WHERE id = ?");
    $stmt->execute([$id]);
    $role = $stmt->fetch();
    if (!$role) { Response::error('Role not found', 404); return; }
    if ($role['is_system']) { Response::error('Cannot delete system role', 403); return; }

    $db->prepare("UPDATE users SET admin_role_id = NULL WHERE admin_role_id = ?")->execute([$id]); // unassign users
    $db->prepare("DELETE FROM admin_roles WHERE id = ?")->execute([$id]);
    Response::success([], 'Role deleted');
  }

  /* ── Permissions ───────────────────────────────────────── */

  public static function adminPermissions(): void
  {
    AuthMiddleware::authenticateAgent();
    $db = Database::getConnection();
    $rows = $db->query(
      "SELECT * FROM admin_permissions ORDER BY permission_group, id ASC"
    )->fetchAll();

    $grouped = [];
    foreach ($rows as &$r) {
      $r['id'] = (int)$r['id'];
      $g = $r['permission_group'];
      if (!isset($grouped[$g])) $grouped[$g] = [];
      $grouped[$g][] = $r;
    }

    Response::success([
      'all' => $rows,
      'grouped' => $grouped,
    ], 'Permissions retrieved');
  }

  public static function adminUpdateRolePermissions(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $id = (int)($params['id'] ?? 0);
    if (!$id) { Response::error('Role ID required', 400); return; }

    $input = json_decode(file_get_contents('php://input'), true);
    $permissionIds = $input['permission_ids'] ?? [];

    if (!is_array($permissionIds)) { Response::error('permission_ids must be an array', 400); return; }
    $permissionIds = array_map('intval', $permissionIds);
    $permissionIds = array_unique($permissionIds);

    $db = Database::getConnection();
    $db->beginTransaction();
    try {
      $db->prepare("DELETE FROM admin_role_permissions WHERE role_id = ?")->execute([$id]);
      if (!empty($permissionIds)) {
        $stmt = $db->prepare("INSERT INTO admin_role_permissions (role_id, permission_id) VALUES (?, ?)");
        foreach ($permissionIds as $permId) {
          $stmt->execute([$id, $permId]);
        }
      }
      $db->commit();
      Response::success(['assigned' => count($permissionIds)], 'Role permissions updated');
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Failed to update permissions: ' . $e->getMessage(), 500);
    }
  }

  /* ── User role assignment ───────────────────────────────── */

  public static function adminRoleUsers(): void
  {
    AuthMiddleware::authenticateAgent();
    $db = Database::getConnection();
    $rows = $db->query(
      "SELECT u.id, u.name, u.email, u.role, u.admin_role_id,
              r.name as role_name, r.slug as role_slug
       FROM users u
       LEFT JOIN admin_roles r ON u.admin_role_id = r.id
       WHERE u.role IN ('admin', 'superadmin')
       ORDER BY u.name ASC"
    )->fetchAll();

    foreach ($rows as &$r) {
      $r['id'] = (int)$r['id'];
      $r['admin_role_id'] = $r['admin_role_id'] ? (int)$r['admin_role_id'] : null;
    }

    Response::success($rows, 'Admin users retrieved');
  }

  public static function adminAssignRole(): void
  {
    AuthMiddleware::authenticateAgent();
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = (int)($input['user_id'] ?? 0);
    $roleId = $input['role_id'] !== null ? (int)$input['role_id'] : null;

    if (!$userId) { Response::error('User ID required', 400); return; }

    $db = Database::getConnection();

    if ($roleId) {
      $stmt = $db->prepare("SELECT id FROM admin_roles WHERE id = ?");
      $stmt->execute([$roleId]);
      if (!$stmt->fetch()) { Response::error('Role not found', 404); return; }
    }

    $db->prepare("UPDATE users SET admin_role_id = ? WHERE id = ?")->execute([$roleId, $userId]);
    Response::success([], 'Role assigned');
  }

  /* ── Current admin permissions ──────────────────────────── */

  public static function adminMyPermissions(): void
  {
    $user = AuthMiddleware::authenticateAgent();

    // Superadmin bypass: return all permissions
    if ($user['role'] === 'superadmin') {
      $db = Database::getConnection();
      $all = $db->query("SELECT slug FROM admin_permissions")->fetchAll(PDO::FETCH_COLUMN);
      Response::success(['permissions' => $all], 'All permissions (superadmin)');
      return;
    }

    $db = Database::getConnection();
    // Fall back to role-based permissions
    $roleSlug = $user['role']; // 'admin'
    $stmt = $db->prepare(
      "SELECT p.slug FROM admin_permissions p
       INNER JOIN admin_role_permissions rp ON p.id = rp.permission_id
       INNER JOIN admin_roles r ON r.id = rp.role_id
       WHERE r.slug = ?"
    );
    $stmt->execute([$roleSlug]);
    $permissions = $stmt->fetchAll(PDO::FETCH_COLUMN);
    Response::success(['permissions' => $permissions], 'My permissions');
  }
}
