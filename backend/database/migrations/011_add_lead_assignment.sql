ALTER TABLE inquiries
  ADD COLUMN assigned_to INT UNSIGNED NULL AFTER notes,
  ADD INDEX idx_inquiries_assigned (assigned_to);
