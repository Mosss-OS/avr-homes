-- AVR Homes - Database Schema
-- MySQL 8+

CREATE DATABASE IF NOT EXISTS avr_homes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE avr_homes;

-- -----------------------------------------------------------
-- Users (Admin + Agents)
-- -----------------------------------------------------------
CREATE TABLE users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100)    NOT NULL,
  email           VARCHAR(255)    NOT NULL UNIQUE,
  password        VARCHAR(255)    NOT NULL,
  role            ENUM('admin','superadmin','agent') NOT NULL DEFAULT 'agent',
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  email_verified_at TIMESTAMP     NULL,
  lasrera_number  VARCHAR(50)     NULL,
  niesv_number    VARCHAR(50)     NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Agents (Public Profiles)
-- -----------------------------------------------------------
CREATE TABLE agents (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED    NULL,
  name        VARCHAR(100)    NOT NULL,
  agency      VARCHAR(150)    NOT NULL DEFAULT 'AVR Homes',
  phone       VARCHAR(30)     NOT NULL,
  email       VARCHAR(255)    NOT NULL,
  whatsapp    VARCHAR(30)     NULL,
  languages   JSON            NOT NULL,
  listings    INT UNSIGNED    NOT NULL DEFAULT 0,
  avatar_hue  INT UNSIGNED    NOT NULL DEFAULT 195,
  bio         TEXT            NULL,
  experience  ENUM('1-2','3-5','6-10','10+') NULL,
  state       VARCHAR(100)    NULL,
  city        VARCHAR(100)    NULL,
  niesv_number VARCHAR(50)    NULL,
  lasrera_number VARCHAR(50)  NULL,
  avg_monthly_listings ENUM('1-5','6-15','16-30','30+') NULL,
  property_types JSON        NULL,
  avg_deal_size ENUM('below-10m','10m-50m','50m-200m','200m+') NULL,
  specialization JSON        NULL,
  social_instagram VARCHAR(100) NULL,
  social_facebook VARCHAR(100) NULL,
  social_linkedin VARCHAR(100) NULL,
  social_tiktok VARCHAR(100) NULL,
  social_youtube VARCHAR(100) NULL,
  why_join    TEXT            NULL,
  support_needed JSON         NULL,
  referral_source VARCHAR(100) NULL,
  is_verified TINYINT(1)      NOT NULL DEFAULT 0,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_agents_email (email),
  INDEX idx_agents_active (is_active),
  INDEX idx_agents_user (user_id),
  CONSTRAINT fk_agents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
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
  status      ENUM('new','contacted','qualified','closed') NOT NULL DEFAULT 'new',
  notes       TEXT            NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_inquiries_property (property_id),
  INDEX idx_inquiries_read (is_read),
  INDEX idx_inquiries_status (status),

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
-- Agent Subscriptions & Tiers
-- -----------------------------------------------------------
CREATE TABLE agent_subscriptions (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  agent_id                INT UNSIGNED    NOT NULL,
  tier                    ENUM('free','bronze','silver','gold','platinum') NOT NULL DEFAULT 'free',
  status                  ENUM('active','cancelled','past_due','trialing') NOT NULL DEFAULT 'active',
  listings_limit          INT UNSIGNED    NOT NULL DEFAULT 3,
  featured_slots          INT UNSIGNED    NOT NULL DEFAULT 0,
  lead_priority           TINYINT(1)      NOT NULL DEFAULT 0,
  analytics_access        TINYINT(1)      NOT NULL DEFAULT 0,
  verification_priority   TINYINT(1)      NOT NULL DEFAULT 0,
  dedicated_manager       TINYINT(1)      NOT NULL DEFAULT 0,
  current_period_start    TIMESTAMP       NOT NULL,
  current_period_end      TIMESTAMP       NOT NULL,
  paystack_subscription_code VARCHAR(100) NULL,
  paystack_customer_code  VARCHAR(100)    NULL,
  cancelled_at            TIMESTAMP       NULL,
  created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_sub_agent (agent_id),
  INDEX idx_sub_status (status),
  CONSTRAINT fk_sub_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Referral System
-- -----------------------------------------------------------
CREATE TABLE referrals (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  referrer_id     INT UNSIGNED    NOT NULL,
  referred_id     INT UNSIGNED    NULL,
  referral_code   VARCHAR(20)     NOT NULL UNIQUE,
  status          ENUM('pending','signed_up','upgraded','developer_referred','bulk_buyer_referred') NOT NULL DEFAULT 'pending',
  reward_amount   DECIMAL(12,2)   NOT NULL DEFAULT 0,
  reward_paid     TINYINT(1)      NOT NULL DEFAULT 0,
  paid_at         TIMESTAMP       NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_ref_referrer (referrer_id),
  INDEX idx_ref_referred (referred_id),
  INDEX idx_ref_code (referral_code),
  INDEX idx_ref_status (status),
  CONSTRAINT fk_ref_referrer FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ref_referred FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Agent Wallet (Referral Credits)
-- -----------------------------------------------------------
CREATE TABLE agent_wallets (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  agent_id        INT UNSIGNED    NOT NULL,
  balance         DECIMAL(12,2)   NOT NULL DEFAULT 0,
  total_earned    DECIMAL(12,2)   NOT NULL DEFAULT 0,
  total_withdrawn DECIMAL(12,2)   NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_wallet_agent (agent_id),
  CONSTRAINT fk_wallet_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Wallet Transactions
-- -----------------------------------------------------------
CREATE TABLE wallet_transactions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wallet_id       INT UNSIGNED    NOT NULL,
  type            ENUM('credit','debit') NOT NULL,
  amount          DECIMAL(12,2)   NOT NULL,
  description     VARCHAR(255)    NOT NULL,
  reference       VARCHAR(100)    NULL,
  status          ENUM('pending','completed','failed') NOT NULL DEFAULT 'completed',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_wtx_wallet (wallet_id),
  INDEX idx_wtx_status (status),
  CONSTRAINT fk_wtx_wallet FOREIGN KEY (wallet_id) REFERENCES agent_wallets(id) ON DELETE CASCADE ON UPDATE CASCADE
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
-- Refresh Tokens
-- -----------------------------------------------------------
CREATE TABLE refresh_tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED    NOT NULL,
  token       VARCHAR(500)    NOT NULL UNIQUE,
  expires_at  TIMESTAMP       NOT NULL,
  revoked_at  TIMESTAMP       NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_rt_user (user_id),
  INDEX idx_rt_token (token),
  INDEX idx_rt_expires (expires_at),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
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
-- Password: admin123 (change immediately in production)
INSERT INTO users (name, email, password, role, is_active, email_verified_at) VALUES
('Admin', 'admin@avrhomes.ng', '$2y$12$JAkpOpgW2WMuFhRHJem53e.OpRuBfr5wT6QOJr1btS9HlWdQjbz1O', 'superadmin', 1, NOW());

-- -----------------------------------------------------------
-- Seed Agents
-- -----------------------------------------------------------
INSERT INTO agents (id, user_id, name, agency, phone, email, whatsapp, languages, listings, avatar_hue, is_verified, experience, state, city) VALUES
(1, NULL, 'Adaeze Okafor', 'AVR Homes', '+234 802 123 4567', 'adaeze@avrhomes.ng', '+234 802 123 4567', '["English","Igbo"]', 42, 195, 1, '10+', 'Lagos', 'Lekki'),
(2, NULL, 'Tunde Bakare', 'AVR Homes', '+234 809 987 6543', 'tunde@avrhomes.ng', '+234 809 987 6543', '["English","Yoruba","French"]', 28, 75, 1, '6-10', 'Lagos', 'Victoria Island'),
(3, NULL, 'Zainab Mohammed', 'AVR Homes', '+234 813 555 1212', 'zainab@avrhomes.ng', '+234 813 555 1212', '["English","Hausa"]', 36, 220, 1, '3-5', 'Lagos', 'Ikoyi');
