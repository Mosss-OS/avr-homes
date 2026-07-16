-- Migration 019: Add property_url column to inquiries table
ALTER TABLE inquiries
  ADD COLUMN property_url VARCHAR(500) DEFAULT NULL AFTER message;
