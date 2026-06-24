-- Migration: Agent Profile Management
-- Adds slug for public profile URLs and photo_url for avatar uploads

ALTER TABLE agents
  ADD COLUMN slug VARCHAR(255) NULL AFTER id,
  ADD COLUMN photo_url VARCHAR(500) NULL AFTER slug,
  ADD UNIQUE INDEX uq_agents_slug (slug);

-- Generate slugs for existing agents
UPDATE agents SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;
