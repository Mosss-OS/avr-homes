-- Migration: Property Verification System
-- Adds verification workflow with document uploads and admin review

-- 1. Extend properties table with verification metadata
ALTER TABLE properties
  ADD COLUMN verified_by       INT UNSIGNED  NULL AFTER is_verified,
  ADD COLUMN verified_at       TIMESTAMP     NULL AFTER verified_by,
  ADD COLUMN verification_expires_at TIMESTAMP NULL AFTER verified_at;

-- 2. Create verification requests table
CREATE TABLE IF NOT EXISTS property_verifications (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id     INT UNSIGNED    NOT NULL,
  agent_id        INT UNSIGNED    NOT NULL,
  status          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  admin_id        INT UNSIGNED    NULL,
  admin_notes     TEXT            NULL,
  rejection_reason VARCHAR(500)   NULL,
  expires_at      TIMESTAMP       NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vf_property (property_id),
  INDEX idx_vf_agent (agent_id),
  INDEX idx_vf_status (status),
  INDEX idx_vf_admin (admin_id),

  CONSTRAINT fk_vf_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_vf_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_vf_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create property documents table
CREATE TABLE IF NOT EXISTS property_documents (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id     INT UNSIGNED    NOT NULL,
  verification_id INT UNSIGNED    NULL,
  document_type   ENUM('certificate_of_occupancy','survey_plan','deed_of_assignment','governors_consent','agent_lasrera_id','property_photo') NOT NULL,
  file_path       VARCHAR(500)    NOT NULL,
  original_name   VARCHAR(255)    NULL,
  file_size       INT UNSIGNED    NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_doc_property (property_id),
  INDEX idx_doc_verification (verification_id),
  INDEX idx_doc_type (document_type),

  CONSTRAINT fk_doc_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_doc_verification FOREIGN KEY (verification_id) REFERENCES property_verifications(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
