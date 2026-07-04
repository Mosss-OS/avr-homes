-- Add short-let / Airbnb support
-- Safe to re-run; uses information_schema to avoid duplicate column errors

-- 1. Ensure purpose ENUM includes 'shortlet'
ALTER TABLE properties 
  MODIFY COLUMN purpose ENUM('buy','rent','shortlet') NOT NULL;

-- 2. Add min_stay if missing
SET @db = (SELECT DATABASE());
SET @has_min_stay = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'min_stay');
SET @sql_min_stay = IF(@has_min_stay = 0, 'ALTER TABLE properties ADD COLUMN min_stay TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER nightly_price', 'SELECT 1 AS ok');
PREPARE stmt FROM @sql_min_stay;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add max_stay if missing
SET @has_max_stay = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'max_stay');
SET @sql_max_stay = IF(@has_max_stay = 0, 'ALTER TABLE properties ADD COLUMN max_stay TINYINT UNSIGNED NULL AFTER min_stay', 'SELECT 1 AS ok');
PREPARE stmt FROM @sql_max_stay;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Booking table (safe: IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS property_bookings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id INT UNSIGNED NOT NULL,
  guest_name VARCHAR(100) NOT NULL,
  guest_email VARCHAR(150) NOT NULL,
  guest_phone VARCHAR(30) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INT UNSIGNED NOT NULL DEFAULT 1,
  total_price INT UNSIGNED NOT NULL,
  status ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_booking_property (property_id),
  INDEX idx_booking_status (status),
  INDEX idx_booking_dates (check_in, check_out),
  CONSTRAINT fk_booking_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Availability table (safe: IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS property_availability (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id INT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  price_override INT UNSIGNED NULL COMMENT 'Per-night price override for this date',
  UNIQUE KEY uk_avail_date (property_id, date),
  INDEX idx_avail_property (property_id),
  INDEX idx_avail_date (date),
  CONSTRAINT fk_avail_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
