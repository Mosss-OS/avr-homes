-- Migration 015: Add off-plan project fields and progress tracking
-- Adds is_off_plan flag and completion_date to properties table
-- Creates off_plan_progress table for monthly development updates

ALTER TABLE properties
  ADD COLUMN is_off_plan TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active,
  ADD COLUMN completion_date DATE NULL AFTER is_off_plan;

CREATE TABLE IF NOT EXISTS off_plan_progress (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id INT UNSIGNED NOT NULL,
  month_number INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  images JSON NULL,
  videos JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_progress_property (property_id),
  INDEX idx_progress_month (property_id, month_number),

  CONSTRAINT fk_progress_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
