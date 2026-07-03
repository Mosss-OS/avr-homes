-- Blog / CMS tables

CREATE TABLE IF NOT EXISTS blog_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_category_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_posts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  excerpt TEXT NULL,
  content LONGTEXT NOT NULL,
  featured_image VARCHAR(500) NULL,
  author_id INT UNSIGNED NULL,
  author_name VARCHAR(100) NOT NULL DEFAULT 'AVR Homes',
  category_id INT UNSIGNED NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  meta_title VARCHAR(200) NULL,
  meta_description VARCHAR(320) NULL,
  tags JSON NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  view_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_blog_slug (slug),
  INDEX idx_blog_status (status),
  INDEX idx_blog_published (published_at),
  INDEX idx_blog_category (category_id),
  INDEX idx_blog_featured (is_featured),
  FULLTEXT idx_blog_search (title, excerpt, content),

  CONSTRAINT fk_blog_category FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_blog_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default categories
INSERT INTO blog_categories (name, slug, description) VALUES
  ('Market Insights', 'market-insights', 'Lagos real estate market trends and analysis'),
  ('Buying Guides', 'buying-guides', 'Step-by-step guides for buying property in Nigeria'),
  ('Neighbourhood Guides', 'neighbourhood-guides', 'Explore Lagos neighbourhoods and communities'),
  ('Investor Tips', 'investor-tips', 'Tips for local and diaspora property investors'),
  ('Agent Resources', 'agent-resources', 'Tools and tips for real estate agents');
