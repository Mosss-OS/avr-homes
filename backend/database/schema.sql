-- AVR Homes - Database Schema
-- MySQL 8+

CREATE DATABASE IF NOT EXISTS avr_homes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE avr_homes;

-- -----------------------------------------------------------
-- Users (Admin)
-- -----------------------------------------------------------
CREATE TABLE users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)    NOT NULL,
  email       VARCHAR(255)    NOT NULL UNIQUE,
  password    VARCHAR(255)    NOT NULL,
  role        ENUM('admin','superadmin') NOT NULL DEFAULT 'admin',
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Agents
-- -----------------------------------------------------------
CREATE TABLE agents (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)    NOT NULL,
  agency      VARCHAR(150)    NOT NULL DEFAULT 'AVR Homes',
  phone       VARCHAR(30)     NOT NULL,
  email       VARCHAR(255)    NOT NULL,
  languages   JSON            NOT NULL,
  listings    INT UNSIGNED    NOT NULL DEFAULT 0,
  avatar_hue  INT UNSIGNED    NOT NULL DEFAULT 195,
  bio         TEXT            NULL,
  is_verified TINYINT(1)      NOT NULL DEFAULT 0,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_agents_email (email),
  INDEX idx_agents_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Properties
-- -----------------------------------------------------------
CREATE TABLE properties (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(255)    NOT NULL,
  slug            VARCHAR(255)    NOT NULL UNIQUE,
  description     TEXT            NOT NULL,
  type            ENUM('apartment','villa','townhouse','penthouse','studio') NOT NULL,
  purpose         ENUM('buy','rent') NOT NULL,
  price           BIGINT UNSIGNED NOT NULL,
  beds            TINYINT UNSIGNED NOT NULL DEFAULT 0,
  baths           TINYINT UNSIGNED NOT NULL DEFAULT 0,
  area            INT UNSIGNED    NOT NULL DEFAULT 0,
  city            VARCHAR(100)    NOT NULL,
  community       VARCHAR(150)    NOT NULL,
  address         VARCHAR(255)    NOT NULL,
  lat             DECIMAL(10,7)   NOT NULL,
  lng             DECIMAL(10,7)   NOT NULL,
  image           VARCHAR(500)    NULL,
  amenities       JSON            NOT NULL,
  agent_id        INT UNSIGNED    NULL,
  featured        TINYINT(1)      NOT NULL DEFAULT 0,
  is_verified     TINYINT(1)      NOT NULL DEFAULT 0,
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  posted_days_ago INT UNSIGNED    NOT NULL DEFAULT 0,
  meta_title      VARCHAR(255)    NULL,
  meta_description TEXT           NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_properties_purpose (purpose),
  INDEX idx_properties_type (type),
  INDEX idx_properties_city (city),
  INDEX idx_properties_featured (featured),
  INDEX idx_properties_active (is_active),
  INDEX idx_properties_price (price),
  INDEX idx_properties_agent (agent_id),
  FULLTEXT INDEX idx_properties_search (title, description, address, community),

  CONSTRAINT fk_properties_agent
    FOREIGN KEY (agent_id) REFERENCES agents(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Property Images (Gallery)
-- -----------------------------------------------------------
CREATE TABLE property_images (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id INT UNSIGNED    NOT NULL,
  file_path   VARCHAR(500)    NOT NULL,
  file_name   VARCHAR(255)    NOT NULL,
  file_size   INT UNSIGNED    NOT NULL DEFAULT 0,
  mime_type   VARCHAR(50)     NOT NULL DEFAULT 'image/jpeg',
  is_primary  TINYINT(1)      NOT NULL DEFAULT 0,
  sort_order  INT UNSIGNED    NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_images_property (property_id),
  INDEX idx_images_primary (property_id, is_primary),

  CONSTRAINT fk_images_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Inquiries (Property Viewing Requests)
-- -----------------------------------------------------------
CREATE TABLE inquiries (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id INT UNSIGNED    NULL,
  name        VARCHAR(100)    NOT NULL,
  email       VARCHAR(255)    NOT NULL,
  phone       VARCHAR(30)     NOT NULL,
  message     TEXT            NOT NULL,
  is_read     TINYINT(1)      NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_inquiries_property (property_id),
  INDEX idx_inquiries_read (is_read),

  CONSTRAINT fk_inquiries_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Contact Messages
-- -----------------------------------------------------------
CREATE TABLE contact_messages (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)    NOT NULL,
  email         VARCHAR(255)    NOT NULL,
  phone         VARCHAR(30)     NOT NULL,
  enquiry_type  VARCHAR(50)     NOT NULL,
  message       TEXT            NOT NULL,
  is_read       TINYINT(1)      NOT NULL DEFAULT 0,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_contact_read (is_read),
  INDEX idx_contact_type (enquiry_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Newsletter Subscribers
-- -----------------------------------------------------------
CREATE TABLE newsletter_subscribers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(255)    NOT NULL UNIQUE,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_subscribers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Saved Properties (User Favourites)
-- -----------------------------------------------------------
CREATE TABLE saved_properties (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED    NULL,
  property_id INT UNSIGNED    NOT NULL,
  session_id  VARCHAR(255)    NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_saved_user (user_id),
  INDEX idx_saved_property (property_id),
  UNIQUE KEY uk_saved_user_property (user_id, property_id),

  CONSTRAINT fk_saved_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_saved_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Activity Logs
-- -----------------------------------------------------------
CREATE TABLE activity_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED    NULL,
  action      VARCHAR(100)    NOT NULL,
  entity_type VARCHAR(50)     NULL,
  entity_id   INT UNSIGNED    NULL,
  details     JSON            NULL,
  ip_address  VARCHAR(45)     NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_logs_user (user_id),
  INDEX idx_logs_action (action),
  INDEX idx_logs_created (created_at),

  CONSTRAINT fk_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Settings
-- -----------------------------------------------------------
CREATE TABLE settings (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key`       VARCHAR(100)    NOT NULL UNIQUE,
  `value`     TEXT            NOT NULL,
  description VARCHAR(255)    NULL,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_settings_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Default Settings
-- -----------------------------------------------------------
INSERT INTO settings (`key`, `value`, `description`) VALUES
('site_name', 'AVR Homes', 'Site display name'),
('site_tagline', 'Lagos Luxury, Verified.', 'Site tagline'),
('contact_email', 'hello@avrhomes.ng', 'Default contact email'),
('contact_phone', '+234 800 000 0000', 'Default contact phone'),
('currency_ngn_usd', '0.00067', 'NGN to USD conversion rate'),
('currency_ngn_gbp', '0.00053', 'NGN to GBP conversion rate'),
('whatsapp_number', '2348000000000', 'WhatsApp business number');

-- -----------------------------------------------------------
-- Seed Admin User (password: admin123)
-- -----------------------------------------------------------
INSERT INTO users (name, email, password, role) VALUES
('Admin', 'admin@avrhomes.ng', '$2y$12$LJ3m4ys3Lk0TSwHnbfOMe.XkMkPBs0aRHcGXOYz1kzKVqGPmD3MWe', 'superadmin');

-- -----------------------------------------------------------
-- Seed Agents
-- -----------------------------------------------------------
INSERT INTO agents (id, name, agency, phone, email, languages, listings, avatar_hue, is_verified) VALUES
(1, 'Adaeze Okafor', 'AVR Homes', '+234 802 123 4567', 'adaeze@avrhomes.ng', '["English","Igbo"]', 42, 195, 1),
(2, 'Tunde Bakare', 'AVR Homes', '+234 809 987 6543', 'tunde@avrhomes.ng', '["English","Yoruba","French"]', 28, 75, 1),
(3, 'Zainab Mohammed', 'AVR Homes', '+234 813 555 1212', 'zainab@avrhomes.ng', '["English","Hausa"]', 36, 220, 1);
