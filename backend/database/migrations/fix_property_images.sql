-- Fix property images for existing properties (IDs 1-5)
-- Only updates the image column and populates property_images table
-- Safe to run on production — no schema changes, no INSERT INTO properties

-- Update image column on existing properties with Unsplash URLs
UPDATE properties SET image = 'https://images.unsplash.com/photo-1499542062907-d5027894aa9b?w=800&auto=format&fit=crop' WHERE id = 1;
UPDATE properties SET image = 'https://images.unsplash.com/photo-1512915363268-c0a0daa7c7e8?w=800&auto=format&fit=crop' WHERE id = 2;
UPDATE properties SET image = 'https://images.unsplash.com/photo-1600596542815-ffad4c153267?w=800&auto=format&fit=crop' WHERE id = 3;
UPDATE properties SET image = 'https://images.unsplash.com/photo-1600585152220-1907a2105d18?w=800&auto=format&fit=crop' WHERE id = 4;
UPDATE properties SET image = 'https://images.unsplash.com/photo-1600047509807-ba1c22c93cf1?w=800&auto=format&fit=crop' WHERE id = 5;

-- Insert into property_images table (skip if table doesn't exist — just the image column update above is enough)
INSERT IGNORE INTO property_images (property_id, file_path, file_name, mime_type, is_primary, sort_order) VALUES
(1, 'https://images.unsplash.com/photo-1499542062907-d5027894aa9b?w=800&auto=format&fit=crop', 'hero.jpg', 'image/jpeg', 1, 1),
(2, 'https://images.unsplash.com/photo-1512915363268-c0a0daa7c7e8?w=800&auto=format&fit=crop', 'hero.jpg', 'image/jpeg', 1, 1),
(3, 'https://images.unsplash.com/photo-1600596542815-ffad4c153267?w=800&auto=format&fit=crop', 'hero.jpg', 'image/jpeg', 1, 1),
(4, 'https://images.unsplash.com/photo-1600585152220-1907a2105d18?w=800&auto=format&fit=crop', 'hero.jpg', 'image/jpeg', 1, 1),
(5, 'https://images.unsplash.com/photo-1600047509807-ba1c22c93cf1?w=800&auto=format&fit=crop', 'hero.jpg', 'image/jpeg', 1, 1);
