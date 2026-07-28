-- Migration 021: Add payment_ref column to inquiries table for Paystack verification
ALTER TABLE inquiries
  ADD COLUMN payment_ref VARCHAR(100) DEFAULT NULL AFTER property_url,
  ADD INDEX idx_inquiries_payment_ref (payment_ref);
