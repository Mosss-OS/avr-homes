-- Fix property images with verified working Unsplash URLs
UPDATE properties SET image = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop' WHERE id = 1;
UPDATE properties SET image = 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&auto=format&fit=crop' WHERE id = 2;
UPDATE properties SET image = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop' WHERE id = 3;
UPDATE properties SET image = 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&auto=format&fit=crop' WHERE id = 4;
UPDATE properties SET image = 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&auto=format&fit=crop' WHERE id = 5;

INSERT IGNORE INTO property_images (property_id, file_path, file_name, mime_type, is_primary, sort_order) VALUES
(1, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop', 'hero.jpg', 'image/jpeg', 1, 1),
(2, 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&auto=format&fit=crop', 'hero.jpg', 'image/jpeg', 1, 1),
(3, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop', 'hero.jpg', 'image/jpeg', 1, 1),
(4, 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&auto=format&fit=crop', 'hero.jpg', 'image/jpeg', 1, 1),
(5, 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&auto=format&fit=crop', 'hero.jpg', 'image/jpeg', 1, 1);
