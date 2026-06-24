-- Migration: Agent Lead Inbox
-- Adds status tracking and internal notes to inquiries table

ALTER TABLE inquiries
  ADD COLUMN status ENUM('new','contacted','qualified','closed') NOT NULL DEFAULT 'new' AFTER is_read,
  ADD COLUMN notes TEXT NULL AFTER status,
  ADD INDEX idx_inquiries_status (status);
