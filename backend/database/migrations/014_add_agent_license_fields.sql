-- Migration: Add LASRERA/NIESV license fields to agents table
-- The original migration 001 added these to the users table by mistake;
-- the application code writes to agents, so we add them here.

ALTER TABLE agents
  ADD COLUMN lasrera_number VARCHAR(50) NULL AFTER email,
  ADD COLUMN niesv_number VARCHAR(50) NULL AFTER lasrera_number;
