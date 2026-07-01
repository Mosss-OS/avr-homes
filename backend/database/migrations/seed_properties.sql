-- Seed SQL for AVR Homes Property Images
-- This script populates the properties and property_images tables with sample data
-- to ensure property cards display hero images correctly in the frontend

START TRANSACTION;

-- First, empty any existing data to ensure clean state
DELETE FROM property_images WHERE property_id BETWEEN 1 AND 5;
DELETE FROM properties WHERE id BETWEEN 1 AND 5;

-- Recreate properties table with current schema
CREATE TABLE properties (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(255)    NOT NULL,
  slug            VARCHAR(255)    NOT NULL UNIQUE,
  description     TEXT            NOT NULL,
  type            ENUM('apartment','villa','townhouse','penthouse','studio') NOT NULL,
  purpose         ENUM('buy','rent') NOT NULL,
  price           BIGINT UNSIGNED NOT NULL,
  beds            TINYINT UNSIGNED NOT NULL DEFAULT 0,
  baths           TINYINT UNSIGNED NOT NULL DEFAULT 0,
  area            INT UNSIGNED    NOT NULL DEFAULT 0,
  city            VARCHAR(100)    NOT NULL,
  community       VARCHAR(150)    NOT NULL,
  address         VARCHAR(255)    NOT NULL,
  lat             DECIMAL(10,7)   NOT NULL,
  lng             DECIMAL(10,7)   NOT NULL,
  image           VARCHAR(500)    NULL,
  video_url       VARCHAR(500)    NULL,
  virtual_tour_url VARCHAR(500)    NULL,
  floor_plan_url  VARCHAR(500)    NULL,
  amenities       JSON            NOT NULL,
  agent_id        INT UNSIGNED    NULL,
  featured        TINYINT(1)      NOT NULL DEFAULT 0,
  is_verified     TINYINT(1)      NOT NULL DEFAULT 0,
  verified_by     INT UNSIGNED    NULL,
  verified_at     TIMESTAMP       NULL,
  verification_expires_at TIMESTAMP NULL,
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  posted_days_ago INT UNSIGNED NOT NULL DEFAULT 0,
  meta_title      VARCHAR(255)    NULL,
  meta_description TEXT            NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create property_images table
CREATE TABLE property_images (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id     INT UNSIGNED    NOT NULL,
  file_path      VARCHAR(500)    NOT NULL,
  file_name      VARCHAR(255)    NOT NULL,
  file_size      INT UNSIGNED    NOT NULL DEFAULT 0,
  mime_type      VARCHAR(50)     NOT NULL DEFAULT 'image/jpeg',
  is_primary      TINYINT(1)      NOT NULL DEFAULT 0,
  sort_order     INT UNSIGNED    NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_property (property_id),
  INDEX idx_primary (is_primary),

  CONSTRAINT fk_property_image FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample properties with realistic data
INSERT INTO properties (
    id, title, slug, description, type, purpose, price, beds, baths, area,
    city, community, address, lat, lng, agent_id, image,
    video_url, virtual_tour_url, floor_plan_url,
    amenities, posted_days_ago, views, likes,
    is_verified
) VALUES
(1, 'Luxury Studio in Ikoyi', 'luxury-studio-in-ikoyi', 'Fully furnished luxury studio apartment in a prime Ikoyi location. Ideal for young professionals. Access to gym and pool.', 'apartment', 'rent', 4500000, 1, 1, 60,
 'Lagos', 'Ikoyi', '2B, King Frederick Jr. Street, Ikoyi', 6.4331, 3.4787, 1,
 'https://images.unsplash.com/photo-1499542062907-d5027894aa9b?w=800&auto=format&fit=crop', '', '', '', '[]', 5, 150, 300,
 1),
(2, '4-Bedroom Duplex in Banana Island', '4-bedroom-duplex-in-banana-island', 'Spacious 4-bedroom duplex with private pool and express elevator access in Banana Island. Close to Victoria Island.', 'villa', 'buy', 25000000, 4, 5, 400,
 'Lagos', 'Banana Island', 'Block 2, Road 12, Banana Island', 6.2958, 3.4555, 1,
 'https://images.unsplash.com/photo-1512915363268-c0a0daa7c7e8?w=800&auto=format&fit=crop', 'https://www.youtube.com/embed/RGZnpfKg7rg', '', '', '["Private Pool", "Express Elevator", "Security", "Garden"]', 3, 1200, 299,
 1),
(3, 'Modern Apartment in Victoria Island', 'modern-apartment-in-victoria-island', 'Bright modern apartment with sea view, located in the heart of Victoria Island. Minutes from the business district.', 'penthouse', 'rent', 8000000, 2, 3, 200,
 'Lagos', 'Victoria Island', 'Plot 45, Taiwo Road, Victoria Island', 6.4476, 3.4988, 1,
 'https://images.unsplash.com/photo-1600596542815-ffad4c153267?w=800&auto=format&fit=crop', '', 'https://tour.example.com/property2', '', '["Sea View", "Furnished", "Security", "Power Backup"]', 12, 800, 89,
 1),
(4, 'Penthouse at Eko Atlantic', 'penthouse-at-eko-atlantic', 'Exclusively located in Eko Atlantic City\'s prestigious district. Smart home features, panoramic ocean views, and private rooftop terrace.', 'penthouse', 'buy', 45000000, 3, 4, 350,
 'Lagos', 'Eko Atlantic', 'Phase 1, VIP Tower A', 6.0836, 3.4694, 1,
 'https://images.unsplash.com/photo-1600585152220-1907a2105d18?w=800&auto=format&fit=crop', '', '', 'https://floorplans.ekoatlantic.com/property4.pdf', 18, 2200, 45,
 1),
(5, 'Luxury Villa in Lekki Phase 1', 'luxury-villa-in-lekki-phase-1', 'Spacious villa with private garden, infinity pool, and 3-bedroom suite. Located in the heart of Lekki Phase 1.', 'villa', 'buy', 35000000, 3, 3, 500,
 'Lagos', 'Lekki', 'Block B14, Langbasa Road', 6.4543, 3.4505, 1,
 'https://images.unsplash.com/photo-1600047509807-ba1c22c93cf1?w=800&auto=format&fit=crop', '', '', '', '["Marble Flooring", "Fireplace", "Enclosed Breakfast", "Laundry Room"]', 24, 4500, 78,
 1);

-- Insert hero and gallery images for each property
INSERT INTO property_images (property_id, file_path, file_name, file_size, mime_type, is_primary, sort_order) VALUES
(1, '/uploads/properties/1/hero.jpg', 'hero.jpg', 0, 'image/jpeg', 1, 1),
(1, '/uploads/properties/1/img2.jpg', 'img2.jpg', 0, 'image/jpeg', 0, 2),
(1, '/uploads/properties/1/img3.jpg', 'img3.jpg', 0, 'image/jpeg', 0, 3),
(2, '/uploads/properties/2/hero.jpg', 'hero.jpg', 0, 'image/jpeg', 1, 1),
(2, '/uploads/properties/2/img2.jpg', 'img2.jpg', 0, 'image/jpeg', 0, 2),
(2, '/uploads/properties/2/img3.jpg', 'img3.jpg', 0, 'image/jpeg', 0, 3),
(2, '/uploads/properties/2/img4.jpg', 'img4.jpg', 0, 'image/jpeg', 0, 4),
(3, '/uploads/properties/3/hero.jpg', 'hero.jpg', 0, 'image/jpeg', 1, 1),
(3, '/uploads/properties/3/img2.jpg', 'img2.jpg', 0, 'image/jpeg', 0, 2),
(3, '/uploads/properties/3/img3.jpg', 'img3.jpg', 0, 'image/jpeg', 0, 3),
(3, '/uploads/properties/3/img4.jpg', 'img4.jpg', 0, 'image/jpeg', 0, 4),
(4, '/uploads/properties/4/hero.jpg', 'hero.jpg', 0, 'image/jpeg', 1, 1),
(4, '/uploads/properties/4/img2.jpg', 'img2.jpg', 0, 'image/jpeg', 0, 2),
(4, '/uploads/properties/4/img3.jpg', 'img3.jpg', 0, 'image/jpeg', 0, 3),
(4, '/uploads/properties/4/img4.jpg', 'img4.jpg', 0, 'image/jpeg', 0, 4),
(4, '/uploads/properties/4/img5.jpg', 'img5.jpg', 0, 'image/jpeg', 0, 5),
(5, '/uploads/properties/5/hero.jpg', 'hero.jpg', 0, 'image/jpeg', 1, 1),
(5, '/uploads/properties/5/img2.jpg', 'img2.jpg', 0, 'image/jpeg', 0, 2),
(5, '/uploads/properties/5/img3.jpg', 'img3.jpg', 0, 'image/jpeg', 0, 3),
(5, '/uploads/properties/5/img4.jpg', 'img4.jpg', 0, 'image/jpeg', 0, 4),
(5, '/uploads/properties/5/img5.jpg', 'img5.jpg', 0, 'image/jpeg', 0, 5);

COMMIT;

-- Verification query to confirm data is properly inserted
SELECT p.id, p.title, p.image as hero_image, COUNT(pi.id) as image_count,
       GROUP_CONCAT(CASE WHEN pi.is_primary = 1 THEN pi.file_path ELSE NULL END SEPARATOR ', ') as primary_images
FROM properties p
LEFT JOIN property_images pi ON p.id = pi.property_id
GROUP BY p.id
ORDER BY p.id;
