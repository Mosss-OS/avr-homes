-- Migration 024: Add per-recipient navigation link to notifications
-- Each recipient can have its own destination (e.g. agent -> agent bookings page,
-- admin -> admin bookings page) so clicking a notification opens the right place.

ALTER TABLE notification_recipients
  ADD COLUMN link VARCHAR(255) DEFAULT NULL AFTER user_id;
