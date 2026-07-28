-- Migration 022: Create inquiry_messages table for two-way communication
CREATE TABLE IF NOT EXISTS inquiry_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inquiry_id INT NOT NULL,
  sender_type ENUM('user','agent','admin') NOT NULL DEFAULT 'user',
  sender_email VARCHAR(255) DEFAULT NULL,
  body TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_msg_inquiry (inquiry_id),
  INDEX idx_msg_read (inquiry_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
