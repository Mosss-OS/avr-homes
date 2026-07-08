CREATE TABLE IF NOT EXISTS email_templates (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100)    NOT NULL,
  subject         VARCHAR(255)    NOT NULL,
  body            TEXT            NOT NULL,
  variables       JSON            NULL COMMENT 'JSON array of available variables like ["name","email","code"]',
  category        VARCHAR(50)     NOT NULL DEFAULT 'general' COMMENT 'welcome, booking, subscription, verification, marketing, general',
  is_system       TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '1 = system template (cannot delete)',
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_et_category (category),
  INDEX idx_et_system (is_system)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_broadcasts (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject         VARCHAR(255)    NOT NULL,
  body            TEXT            NOT NULL,
  recipient_filter VARCHAR(50)    NOT NULL DEFAULT 'all' COMMENT 'all, agents, users, verified_agents, subscribers',
  sent_count      INT UNSIGNED    NOT NULL DEFAULT 0,
  status          ENUM('draft','scheduled','sending','sent','failed') NOT NULL DEFAULT 'draft',
  scheduled_at    TIMESTAMP       NULL,
  sent_at         TIMESTAMP       NULL,
  created_by      INT UNSIGNED    NOT NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_eb_status (status),
  INDEX idx_eb_scheduled (scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
