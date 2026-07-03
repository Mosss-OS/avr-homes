# -- Phase 2 Marketplace Database Extensions

-- ###############################################################################
-- Diaspora Investment Rails
-- ###############################################################################

-- Diaspora customers need multi-currency support and international transfers
CREATE TABLE IF NOT EXISTS diaspora_investors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  nationality VARCHAR(50) NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  currency_preference ENUM('NGN', 'USD', 'GBP', 'EUR') NOT NULL DEFAULT 'USD',
  phone_international_format VARCHAR(20) NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  kyc_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  wallet_id VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_diaspora_user (user_id),
  INDEX idx_diaspora_nationality (nationality),
  INDEX idx_diaspora_country (country_code),
  INDEX idx_diaspora_verified (is_verified),

  CONSTRAINT fk_diaspora_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Multi-currency wallet balances for diaspora investors
CREATE TABLE IF NOT EXISTS diaspora_wallets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  investor_id INT UNSIGNED NOT NULL,
  currency ENUM('NGN', 'USD', 'GBP', 'EUR') NOT NULL,
  balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  pending_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  wallet_address VARCHAR(100) NULL,
  bank_account VARCHAR(50) NULL,
  routing_number VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_diaspora_wallet UNIQUE (investor_id, currency),
  INDEX idx_diaspora_wallet_balance (balance),

  CONSTRAINT fk_diaspora_wallet FOREIGN KEY (investor_id) REFERENCES diaspora_investors(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wire transfer records with international routing
CREATE TABLE IF NOT EXISTS wire_transfers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wallet_id INT UNSIGNED NOT NULL,
  reference VARCHAR(50) NOT NULL UNIQUE,
  amount DECIMAL(18,2) NOT NULL,
  currency ENUM('NGN', 'USD', 'GBP', 'EUR') NOT NULL,
  sender_name VARCHAR(150) NOT NULL,
  sender_bank VARCHAR(100) NOT NULL,
  sender_account VARCHAR(50) NOT NULL,
  sender_swift_bic VARCHAR(20) NULL,
  sender_iban VARCHAR(50) NULL,
  receiver_name VARCHAR(150) NOT NULL,
  receiver_bank VARCHAR(100) NOT NULL,
  receiver_account VARCHAR(50) NOT NULL,
  routing_code VARCHAR(20) NULL,
  transfer_type ENUM('international', 'domestic', 'swift') NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_wire_wallet (wallet_id),
  INDEX idx_wire_reference (reference),
  INDEX idx_wire_status (status),
  INDEX idx_wire_date (created_at),

  CONSTRAINT fk_wire_wallet FOREIGN KEY (wallet_id) REFERENCES diaspora_wallets(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- International transfer fees and exchange rates (live rates from external service)
CREATE TABLE IF NOT EXISTS transfer_rates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  from_currency ENUM('NGN', 'USD', 'GBP', 'EUR') NOT NULL,
  to_currency ENUM('NGN', 'USD', 'GBP', 'EUR') NOT NULL,
  rate DECIMAL(12,6) NOT NULL,
  bank_margin DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  transfer_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  processing_time_hours INT NOT NULL DEFAULT 24,
  min_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  max_amount DECIMAL(18,2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_rates_combination UNIQUE (from_currency, to_currency),
  INDEX idx_rates_active (is_active),
  INDEX idx_rates_from_to (from_currency, to_currency)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add Lagos diaspora market segments for targeted campaigns
INSERT INTO settings (`key`, `value`, `description`) VALUES
  ('diaspora_eligible_cities', 'Lagos,Abuja,Port Harcourt,Ibadan,Benin City', 'Cities where diaspora investors can buy'),
  ('diaspora_min_investment_usd', '50000', 'Minimum investment amount for diaspora (USD)'),
  ('diaspora_max_investment_usd', '10000000', 'Maximum investment amount for diaspora (USD)');

-- ###############################################################################
-- Escrow Integration (Cowrywise/Flutterwave)
-- ###############################################################################

-- Core escrow contracts for property transactions
CREATE TABLE IF NOT EXISTS escrow_contracts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id INT UNSIGNED NOT NULL,
  buyer_id INT UNSIGNED NOT NULL,
  seller_id INT UNSIGNED NOT NULL,
  agent_id INT UNSIGNED NULL,
  amount DECIMAL(18,2) NOT NULL,
  currency ENUM('NGN', 'USD') NOT NULL,
  status ENUM('pending', 'active', 'completed', 'refunded', 'disputed', 'cancelled') NOT NULL DEFAULT 'pending',
  release_conditions JSON NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  escrow_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,2) NOT NULL,
  buyer_payout DECIMAL(18,2) NOT NULL,
  seller_payout DECIMAL(18,2) NOT NULL,
  platform_payout DECIMAL(10,2) NOT NULL,
  contract_hash VARCHAR(100) NULL,
  smart_contract_address VARCHAR(50) NULL,
  tx_hash VARCHAR(100) NULL,
  released_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_escrow_property (property_id),
  INDEX idx_escrow_buyer (buyer_id),
  INDEX idx_escrow_seller (seller_id),
  INDEX idx_escrow_status (status),
  INDEX idx_escrow_expires (expires_at),

  CONSTRAINT fk_escrow_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_escrow_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_escrow_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_escrow_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ledger entries for escrow transactions
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id INT UNSIGNED NOT NULL,
  transaction_type ENUM('deposit', 'release', 'refund', 'fee') NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  currency ENUM('NGN', 'USD') NOT NULL,
  party ENUM('buyer', 'seller', 'platform', 'agent') NOT NULL,
  reference_id VARCHAR(50) NULL,
  status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'completed',
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_escrow_tx_contract (contract_id),
  INDEX idx_escrow_tx_type (transaction_type),
  INDEX idx_escrow_tx_date (created_at),

  CONSTRAINT fk_escrow_tx_contract FOREIGN KEY (contract_id) REFERENCES escrow_contracts(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dispute resolution for escrow contracts
CREATE TABLE IF NOT EXISTS escrow_disputes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id INT UNSIGNED NOT NULL,
  raised_by_id INT UNSIGNED NOT NULL,
  raised_by_type ENUM('buyer', 'seller', 'agent') NOT NULL,
  reason ENUM('non_delivery', 'title_issues', 'payment_issues', 'other') NOT NULL,
  description TEXT NOT NULL,
  evidence_urls JSON NULL,
  status ENUM('open', 'investigating', 'resolved', 'rejected') NOT NULL DEFAULT 'open',
  resolution TEXT NULL,
  resolved_by_id INT UNSIGNED NULL,
  resolved_at TIMESTAMP NULL,
  deadline TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_dispute_contract (contract_id),
  INDEX idx_dispute_raiser (raised_by_id),
  INDEX idx_dispute_status (status),
  INDEX idx_dispute_deadline (deadline),

  CONSTRAINT fk_dispute_contract FOREIGN KEY (contract_id) REFERENCES escrow_contracts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispute_raiser FOREIGN KEY (raised_by_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispute_resolver FOREIGN KEY (resolved_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Integrate with external payment providers (Cowrywise/Flutterwave)
CREATE TABLE IF NOT EXISTS payment_providers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  environment ENUM('sandbox', 'production') NOT NULL DEFAULT 'production',
  api_key_encrypted TEXT NULL,
  api_secret_encrypted TEXT NULL,
  webhook_secret VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  config JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_provider_code (code),
  INDEX idx_provider_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO payment_providers (name, code, environment, config) VALUES
  ('Flutterwave', 'flutterwave', 'production', '{"public_key": "FLWPUBK_TEST-xxxxxxxxxxxxxxxxxxxx", "secret_key": "FLWSECK_TEST-xxxxxxxxxx", "account_id": "1234567"}'),
  ('Cowrywise', 'cowrywise', 'production', '{"api_key": "test_key_xxxxxxxx", "base_url": "https://api.cowrywise.com/v1"}');

-- Payment routing for escrow contracts
CREATE TABLE IF NOT EXISTS payment_routing (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider_id INT UNSIGNED NOT NULL,
  contract_id INT UNSIGNED NOT NULL,
  transaction_type ENUM('payin', 'payout') NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  currency ENUM('NGN', 'USD') NOT NULL,
  reference VARCHAR(50) NOT NULL UNIQUE,
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  payment_data JSON NULL,
  response_data JSON NULL,
  initiated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,

  INDEX idx_payment_provider (provider_id),
  INDEX idx_payment_contract (contract_id),
  INDEX idx_payment_reference (reference),
  INDEX idx_payment_status (status),
  INDEX idx_payment_date (initiated_at),

  CONSTRAINT fk_payment_provider FOREIGN KEY (provider_id) REFERENCES payment_providers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_payment_contract FOREIGN KEY (contract_id) REFERENCES escrow_contracts(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ###############################################################################
-- Admin Settings for Escrow & Diaspora
-- ###############################################################################

INSERT INTO settings (`key`, `value`, `description`) VALUES
  ('escrow_expiry_days', '30', 'Default escrow contract expiry in days'),
  ('escrow_dispute_deadline_hours', '72', 'Hours to resolve escrow disputes after filing'),
  ('diaspora_knowledge_country_codes', 'NG,US,GB,DE,FR,AU,CA,SA,KE', 'Comma-separated country codes for diaspora targeting'),
  ('flutterwave_kyc_level', 'basic', 'Required KYC level for Flutterwave integration'),
  ('cowrywise_kyc_level', 'enhanced', 'Required KYC level for Cowrywise integration');