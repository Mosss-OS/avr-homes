-- Migration: Agent Authentication System
-- Adds authentication support for agents

-- 1. Alter users table to support agent role + new fields
ALTER TABLE users
  MODIFY COLUMN role ENUM('admin','superadmin','agent') NOT NULL DEFAULT 'agent',
  ADD COLUMN email_verified_at TIMESTAMP NULL AFTER is_active,
  ADD COLUMN lasrera_number VARCHAR(50) NULL AFTER email_verified_at,
  ADD COLUMN niesv_number VARCHAR(50) NULL AFTER lasrera_number;

-- 2. Alter agents table to add new fields from Task 5
ALTER TABLE agents
  ADD COLUMN user_id INT UNSIGNED NULL AFTER id,
  ADD COLUMN whatsapp VARCHAR(30) NULL AFTER email,
  ADD COLUMN experience ENUM('1-2','3-5','6-10','10+') NULL AFTER bio,
  ADD COLUMN state VARCHAR(100) NULL AFTER experience,
  ADD COLUMN city VARCHAR(100) NULL AFTER state,
  ADD COLUMN avg_monthly_listings ENUM('1-5','6-15','16-30','30+') NULL AFTER city,
  ADD COLUMN property_types JSON NULL AFTER avg_monthly_listings,
  ADD COLUMN avg_deal_size ENUM('below-10m','10m-50m','50m-200m','200m+') NULL AFTER property_types,
  ADD COLUMN specialization JSON NULL AFTER avg_deal_size,
  ADD COLUMN social_instagram VARCHAR(100) NULL AFTER specialization,
  ADD COLUMN social_facebook VARCHAR(100) NULL AFTER social_instagram,
  ADD COLUMN social_linkedin VARCHAR(100) NULL AFTER social_facebook,
  ADD COLUMN social_tiktok VARCHAR(100) NULL AFTER social_linkedin,
  ADD COLUMN social_youtube VARCHAR(100) NULL AFTER social_tiktok,
  ADD COLUMN why_join TEXT NULL AFTER social_youtube,
  ADD COLUMN support_needed JSON NULL AFTER why_join,
  ADD COLUMN referral_source VARCHAR(100) NULL AFTER support_needed,
  ADD INDEX idx_agents_user (user_id),
  ADD CONSTRAINT fk_agents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
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

-- 4. Create agent_subscriptions table
CREATE TABLE IF NOT EXISTS agent_subscriptions (
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

-- 5. Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
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

-- 6. Create agent_wallets table
CREATE TABLE IF NOT EXISTS agent_wallets (
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

-- 7. Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
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

-- Update admin user to have email_verified_at set
UPDATE users SET email_verified_at = NOW() WHERE email = 'admin@avrhomes.ng';

-- Add UNIQUE constraint to agents.user_id if not exists
-- (skip if already exists)
-- ALTER TABLE agents ADD UNIQUE INDEX uq_agents_user (user_id);
