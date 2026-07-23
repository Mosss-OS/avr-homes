-- Migration 020: Remove ALL dummy/test data
-- Deletes all properties and their gallery images (all are test data)

DELETE FROM property_images;
DELETE FROM property_videos;
DELETE FROM properties;
