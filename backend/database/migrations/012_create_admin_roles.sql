-- Migration: Admin Role-Based Permissions
-- Adds granular roles, permissions, and role-permission mapping
-- Safe to re-run; uses IF NOT EXISTS / information_schema

-- 1. admin_roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL,
  is_system   TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'System roles cannot be deleted',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL,
  permission_group VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT 'Group for UI organisation',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_perm_slug (slug),
  INDEX idx_perm_group (permission_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. admin_role_permissions pivot table
CREATE TABLE IF NOT EXISTS admin_role_permissions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id       INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  UNIQUE KEY uk_role_perm (role_id, permission_id),
  CONSTRAINT fk_arp_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_arp_perm FOREIGN KEY (permission_id) REFERENCES admin_permissions(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Add admin_role_id to users
SET @has_role_col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'admin_role_id');
SET @sql_role_col = IF(@has_role_col = 0,
  'ALTER TABLE users ADD COLUMN admin_role_id INT UNSIGNED NULL AFTER role, ADD INDEX idx_users_admin_role (admin_role_id)',
  'SELECT 1 AS ok');
PREPARE stmt FROM @sql_role_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Seed default roles (if empty)
INSERT IGNORE INTO admin_roles (name, slug, description, is_system) VALUES
  ('Super Admin', 'superadmin', 'Full access to all admin features', 1),
  ('Admin', 'admin', 'Can manage most features except system settings', 1),
  ('Editor', 'editor', 'Can manage content: properties, blog, gallery, email', 1),
  ('Moderator', 'moderator', 'Can review and moderate content, manage inquiries', 1),
  ('Viewer', 'viewer', 'Read-only access to admin dashboard and data', 1);

-- 6. Seed default permissions
INSERT IGNORE INTO admin_permissions (slug, name, description, permission_group) VALUES
  ('dashboard.view', 'View Dashboard', 'Access admin dashboard and overview stats', 'dashboard'),
  ('analytics.view', 'View Analytics', 'View analytics charts and reports', 'analytics'),
  ('properties.view', 'View Properties', 'View property listings', 'properties'),
  ('properties.create', 'Create Properties', 'Add new property listings', 'properties'),
  ('properties.edit', 'Edit Properties', 'Edit existing property listings', 'properties'),
  ('properties.delete', 'Delete Properties', 'Delete property listings', 'properties'),
  ('properties.verify', 'Verify Properties', 'Verify and approve properties', 'properties'),
  ('agents.view', 'View Agents', 'View agent profiles', 'agents'),
  ('agents.create', 'Create Agents', 'Add new agents', 'agents'),
  ('agents.edit', 'Edit Agents', 'Edit agent profiles', 'agents'),
  ('agents.delete', 'Delete Agents', 'Delete agents', 'agents'),
  ('agents.verify', 'Verify Agents', 'Verify agent identities', 'agents'),
  ('users.view', 'View Users', 'View user accounts', 'users'),
  ('users.create', 'Create Users', 'Create new user accounts', 'users'),
  ('users.edit', 'Edit Users', 'Edit user accounts', 'users'),
  ('users.delete', 'Delete Users', 'Delete user accounts', 'users'),
  ('bookings.view', 'View Bookings', 'View booking records', 'bookings'),
  ('bookings.edit', 'Edit Bookings', 'Modify booking status', 'bookings'),
  ('bookings.calendar', 'Manage Calendar', 'Manage booking calendar availability', 'bookings'),
  ('coupons.view', 'View Coupons', 'View coupon codes', 'coupons'),
  ('coupons.create', 'Create Coupons', 'Create discount coupons', 'coupons'),
  ('coupons.edit', 'Edit Coupons', 'Edit coupon codes', 'coupons'),
  ('coupons.delete', 'Delete Coupons', 'Delete coupon codes', 'coupons'),
  ('fees.view', 'View Fees', 'View fee configuration', 'fees'),
  ('fees.edit', 'Edit Fees', 'Modify platform fees and commissions', 'fees'),
  ('email.view', 'View Email', 'View email templates and broadcasts', 'email'),
  ('email.create', 'Create Email', 'Create email broadcasts', 'email'),
  ('email.edit', 'Edit Email', 'Edit email templates', 'email'),
  ('email.delete', 'Delete Email', 'Delete email templates', 'email'),
  ('subscriptions.view', 'View Subscriptions', 'View agent subscriptions', 'subscriptions'),
  ('subscriptions.edit', 'Edit Subscriptions', 'Modify agent subscription tiers/status', 'subscriptions'),
  ('wallet.view', 'View Wallet', 'View agent wallets and transactions', 'wallet'),
  ('wallet.withdrawals', 'Manage Withdrawals', 'Approve/reject withdrawal requests', 'wallet'),
  ('referrals.view', 'View Referrals', 'View referral program data', 'referrals'),
  ('referrals.edit', 'Edit Referrals', 'Modify referral rewards', 'referrals'),
  ('moderation.view', 'View Moderation', 'Access content moderation queue', 'moderation'),
  ('moderation.act', 'Act on Moderation', 'Approve/reject pending content', 'moderation'),
  ('inquiries.view', 'View Inquiries', 'View contact inquiries and leads', 'inquiries'),
  ('inquiries.assign', 'Assign Inquiries', 'Assign inquiries to agents', 'inquiries'),
  ('blog.view', 'View Blog', 'View blog posts', 'blog'),
  ('blog.create', 'Create Blog', 'Write blog posts', 'blog'),
  ('blog.edit', 'Edit Blog', 'Edit any blog post', 'blog'),
  ('blog.delete', 'Delete Blog', 'Delete blog posts', 'blog'),
  ('activity.view', 'View Activity', 'View activity log', 'activity'),
  ('activity.export', 'Export Activity', 'Export activity log to CSV', 'activity'),
  ('settings.view', 'View Settings', 'View system settings', 'settings'),
  ('settings.edit', 'Edit Settings', 'Modify system configuration', 'settings'),
  ('roles.view', 'View Roles', 'View admin roles and permissions', 'roles'),
  ('roles.manage', 'Manage Roles', 'Create/edit/delete roles and assign permissions', 'roles'),
  ('import.view', 'View Import/Export', 'Access import/export page', 'import'),
  ('import.execute', 'Execute Import', 'Import data from CSV', 'import'),
  ('gallery.view', 'View Gallery', 'View property gallery manager', 'gallery'),
  ('gallery.manage', 'Manage Gallery', 'Upload/reorder/delete gallery images', 'gallery'),
  ('maintenance.view', 'View Maintenance', 'View maintenance mode settings', 'maintenance'),
  ('maintenance.edit', 'Edit Maintenance', 'Toggle maintenance mode and site config', 'maintenance');

-- 7. Assign all permissions to Super Admin role
INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r CROSS JOIN admin_permissions p WHERE r.slug = 'superadmin';

-- 8. Assign common permissions to Admin role (exclude roles/manage, import/view, maintenance/edit)
INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r CROSS JOIN admin_permissions p
WHERE r.slug = 'admin' AND p.slug NOT IN (
  'roles.manage', 'settings.edit', 'maintenance.edit'
);

-- 9. Assign permissions to Editor role
INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r CROSS JOIN admin_permissions p
WHERE r.slug = 'editor' AND p.slug IN (
  'dashboard.view', 'properties.view', 'properties.create', 'properties.edit',
  'agents.view', 'users.view', 'bookings.view', 'coupons.view',
  'email.view', 'email.create', 'email.edit',
  'blog.view', 'blog.create', 'blog.edit', 'blog.delete',
  'gallery.view', 'gallery.manage',
  'activity.view', 'import.view', 'import.execute',
  'moderation.view', 'moderation.act'
);

-- 10. Assign permissions to Moderator role
INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r CROSS JOIN admin_permissions p
WHERE r.slug = 'moderator' AND p.slug IN (
  'dashboard.view', 'properties.view', 'properties.verify',
  'agents.view', 'agents.verify',
  'users.view', 'bookings.view',
  'inquiries.view', 'inquiries.assign',
  'moderation.view', 'moderation.act',
  'activity.view', 'blog.view'
);

-- 11. Assign permissions to Viewer role
INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r CROSS JOIN admin_permissions p
WHERE r.slug = 'viewer' AND p.slug IN (
  'dashboard.view', 'analytics.view', 'properties.view',
  'agents.view', 'users.view', 'bookings.view',
  'coupons.view', 'fees.view', 'subscriptions.view',
  'wallet.view', 'referrals.view',
  'inquiries.view', 'blog.view', 'activity.view',
  'gallery.view', 'import.view', 'email.view',
  'moderation.view'
);

-- 12. Assign superadmin role to existing admin users
UPDATE users u
SET u.admin_role_id = (SELECT id FROM admin_roles WHERE slug = 'superadmin')
WHERE u.role IN ('admin', 'superadmin') AND u.admin_role_id IS NULL;
