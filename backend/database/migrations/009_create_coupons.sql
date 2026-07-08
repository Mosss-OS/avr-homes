CREATE TABLE IF NOT EXISTS coupons (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(50)     NOT NULL UNIQUE,
  description     TEXT            NULL,
  discount_type   ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
  discount_value  DECIMAL(12,2)   NOT NULL,
  min_order_amount DECIMAL(12,2)  NULL,
  max_discount    DECIMAL(12,2)   NULL COMMENT 'max discount amount for percentage coupons',
  max_uses        INT UNSIGNED    NULL COMMENT 'max total uses (null = unlimited)',
  max_uses_per_user INT UNSIGNED  NULL COMMENT 'max uses per user (null = unlimited)',
  used_count      INT UNSIGNED    NOT NULL DEFAULT 0,
  applies_to      ENUM('all','buy','rent','shortlet','subscription') NOT NULL DEFAULT 'all',
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  starts_at       TIMESTAMP       NULL,
  expires_at      TIMESTAMP       NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_coupon_code (code),
  INDEX idx_coupon_active (is_active),
  INDEX idx_coupon_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupon_usage (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  coupon_id       INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  order_type      VARCHAR(50)  NOT NULL COMMENT 'booking / subscription / etc',
  order_id        INT UNSIGNED NULL,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  used_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_coupon_usage_coupon (coupon_id),
  INDEX idx_coupon_usage_user (user_id),
  CONSTRAINT fk_cu_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cu_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
