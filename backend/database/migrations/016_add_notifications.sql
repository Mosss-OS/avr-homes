-- Migration 016: Add notifications and notification_recipients tables
-- Enables admin announcements and in-app notification broadcasting

CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'announcement',
  target_role VARCHAR(50) DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  scheduled_at DATETIME DEFAULT NULL,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_type (type),
  INDEX idx_notifications_sent (sent_at),
  CONSTRAINT fk_notifications_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_recipients (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  notification_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  read_at TIMESTAMP NULL,
  UNIQUE KEY uq_recipient (notification_id, user_id),
  INDEX idx_recipient_user (user_id, is_read),
  CONSTRAINT fk_recipient_notification FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipient_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
