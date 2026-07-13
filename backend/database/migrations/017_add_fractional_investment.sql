-- Migration 017: Add fractional investment marketplace tables
-- Enables property tokenization, KYC, and dividend distribution

CREATE TABLE IF NOT EXISTS kyc_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  bvn_number VARCHAR(11) DEFAULT NULL,
  bvn_verified TINYINT(1) DEFAULT 0,
  id_document_url VARCHAR(500) DEFAULT NULL,
  id_document_type VARCHAR(50) DEFAULT NULL,
  id_verified TINYINT(1) DEFAULT 0,
  source_of_funds TEXT DEFAULT NULL,
  accredited_investor TINYINT(1) DEFAULT 0,
  status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_kyc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS investment_properties (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id INT UNSIGNED DEFAULT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  image VARCHAR(500) DEFAULT NULL,
  total_shares INT UNSIGNED NOT NULL,
  share_price DECIMAL(15, 2) NOT NULL,
  available_shares INT UNSIGNED NOT NULL,
  min_investment DECIMAL(15, 2) DEFAULT NULL,
  expected_yield DECIMAL(5, 2) DEFAULT NULL COMMENT 'Annual expected yield percentage',
  distribution_frequency ENUM('monthly', 'quarterly', 'semi_annual', 'annual') DEFAULT 'quarterly',
  status ENUM('active', 'fully_funded', 'closed') DEFAULT 'active',
  property_details JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_investment_status (status),
  CONSTRAINT fk_investment_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS investments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  investment_property_id INT UNSIGNED NOT NULL,
  shares INT UNSIGNED NOT NULL,
  purchase_price DECIMAL(15, 2) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  status ENUM('active', 'sold', 'cancelled') DEFAULT 'active',
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sold_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_investment_user (user_id),
  INDEX idx_investment_property (investment_property_id),
  CONSTRAINT fk_investment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_investment_prop FOREIGN KEY (investment_property_id) REFERENCES investment_properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dividends (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  investment_property_id INT UNSIGNED NOT NULL,
  amount_per_share DECIMAL(15, 2) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  declared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  period_start DATE DEFAULT NULL,
  period_end DATE DEFAULT NULL,
  status ENUM('declared', 'paid') DEFAULT 'declared',
  INDEX idx_dividend_property (investment_property_id),
  CONSTRAINT fk_dividend_property FOREIGN KEY (investment_property_id) REFERENCES investment_properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS investment_dividend_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dividend_id INT UNSIGNED NOT NULL,
  investment_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  shares_held INT UNSIGNED NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  paid_at TIMESTAMP NULL,
  status ENUM('pending', 'paid') DEFAULT 'pending',
  INDEX idx_dividend_payment_dividend (dividend_id),
  INDEX idx_dividend_payment_user (user_id),
  CONSTRAINT fk_dp_dividend FOREIGN KEY (dividend_id) REFERENCES dividends(id) ON DELETE CASCADE,
  CONSTRAINT fk_dp_investment FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE,
  CONSTRAINT fk_dp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
