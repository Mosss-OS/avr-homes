<?php

declare(strict_types=1);

/**
 * BlogController
 *
 * Handles public blog post listing, single post retrieval, categories,
 * featured posts, and agent/admin CRUD operations for blog posts.
 */
class BlogController
{
  // ---- Public routes ----

  /**
   * List published blog posts with pagination, category/tag/search filtering.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function index(array $params): void
  {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(20, max(1, (int)($_GET['per_page'] ?? 10)));
    $category = $_GET['category'] ?? null;
    $tag = $_GET['tag'] ?? null;
    $search = $_GET['search'] ?? null;

    $db = Database::getConnection();
    $conditions = ['status = ?'];
    $bindings = ['published'];

    if ($category) {
      $conditions[] = 'bp.category_id = (SELECT id FROM blog_categories WHERE slug = ?)';
      $bindings[] = $category;
    }
    if ($tag) {
      $conditions[] = 'JSON_SEARCH(bp.tags, \'one\', ?) IS NOT NULL';
      $bindings[] = $tag;
    }
    if ($search) {
      $conditions[] = 'MATCH(bp.title, bp.excerpt, bp.content) AGAINST(? IN BOOLEAN MODE)';
      $bindings[] = $search . '*';
    }

    $where = implode(' AND ', $conditions);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM blog_posts bp WHERE {$where}");
    $countStmt->execute($bindings);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.featured_image, bp.author_name,
              bp.category_id, bc.name as category_name, bc.slug as category_slug,
              bp.published_at, bp.tags, bp.is_featured, bp.view_count
       FROM blog_posts bp
       LEFT JOIN blog_categories bc ON bc.id = bp.category_id
       WHERE {$where}
       ORDER BY bp.is_featured DESC, bp.published_at DESC
       LIMIT ? OFFSET ?"
    );
    $bindings[] = $perPage;
    $bindings[] = $offset;
    $stmt->execute($bindings);
    $posts = $stmt->fetchAll();

    foreach ($posts as &$post) {
      $post['id'] = (int)$post['id'];
      $post['tags'] = json_decode($post['tags'] ?? '[]', true);
      $post['is_featured'] = (bool)$post['is_featured'];
      $post['view_count'] = (int)$post['view_count'];
    }

    Response::success([
      'data' => $posts,
      'total' => $total,
      'page' => $page,
      'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ], 'Blog posts retrieved');
  }

  /**
   * Get a single published blog post by slug with related posts.
   *
   * @param array $params Must contain 'slug'.
   * @return void
   */
  public static function show(array $params): void
  {
    $slug = $params['slug'] ?? null;
    if (!$slug) {
      Response::error('Slug is required', 400);
    }

    $db = Database::getConnection();

    // Increment view count
    $db->prepare("UPDATE blog_posts SET view_count = view_count + 1 WHERE slug = ?")->execute([$slug]);

    $stmt = $db->prepare(
      "SELECT bp.*, bc.name as category_name, bc.slug as category_slug
       FROM blog_posts bp
       LEFT JOIN blog_categories bc ON bc.id = bp.category_id
       WHERE bp.slug = ? AND bp.status = 'published'
       LIMIT 1"
    );
    $stmt->execute([$slug]);
    $post = $stmt->fetch();

    if (!$post) {
      Response::error('Post not found', 404);
    }

    $post['id'] = (int)$post['id'];
    $post['category_id'] = $post['category_id'] ? (int)$post['category_id'] : null;
    $post['tags'] = json_decode($post['tags'] ?? '[]', true);
    $post['is_featured'] = (bool)$post['is_featured'];
    $post['view_count'] = (int)$post['view_count'];
    unset($post['status']);

    // Get related posts (same category, exclude current)
    $relatedStmt = $db->prepare(
      "SELECT id, title, slug, excerpt, featured_image, published_at
       FROM blog_posts
       WHERE category_id = ? AND id != ? AND status = 'published'
       ORDER BY published_at DESC LIMIT 3"
    );
    $relatedStmt->execute([$post['category_id'], $post['id']]);
    $related = $relatedStmt->fetchAll();
    foreach ($related as &$r) {
      $r['id'] = (int)$r['id'];
    }

    Response::success([
      'post' => $post,
      'related' => $related,
    ], 'Blog post retrieved');
  }

  /**
   * List all blog categories with their published post count.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function categories(array $params): void
  {
    $db = Database::getConnection();
    $stmt = $db->query(
      "SELECT bc.*, COUNT(bp.id) as post_count
       FROM blog_categories bc
       LEFT JOIN blog_posts bp ON bp.category_id = bc.id AND bp.status = 'published'
       GROUP BY bc.id
       ORDER BY bc.name ASC"
    );
    $categories = $stmt->fetchAll();
    foreach ($categories as &$c) {
      $c['id'] = (int)$c['id'];
      $c['post_count'] = (int)$c['post_count'];
    }
    Response::success($categories, 'Categories retrieved');
  }

  /**
   * List featured blog posts (max 6).
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function featured(array $params): void
  {
    $db = Database::getConnection();
    $stmt = $db->query(
      "SELECT id, title, slug, excerpt, featured_image, author_name, category_id, published_at
       FROM blog_posts
       WHERE status = 'published' AND is_featured = 1
       ORDER BY published_at DESC LIMIT 6"
    );
    $posts = $stmt->fetchAll();
    foreach ($posts as &$p) {
      $p['id'] = (int)$p['id'];
    }
    Response::success($posts, 'Featured posts retrieved');
  }

  // ---- Agent/Admin routes ----

  /**
   * List blog posts for authenticated agents/admins with pagination and status filter.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function agentIndex(array $params): void
  {
    $user = AuthMiddleware::authenticateAgent();

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $status = $_GET['status'] ?? null;

    $db = Database::getConnection();

    $conditions = [];
    $bindings = [];

    if ($status) {
      $conditions[] = 'bp.status = ?';
      $bindings[] = $status;
    }

    $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

    $countStmt = $db->prepare("SELECT COUNT(*) FROM blog_posts bp {$where}");
    $countStmt->execute($bindings);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.status, bp.is_featured,
              bp.published_at, bp.view_count, bp.created_at, bp.updated_at,
              bc.name as category_name
       FROM blog_posts bp
       LEFT JOIN blog_categories bc ON bc.id = bp.category_id
       {$where}
       ORDER BY bp.updated_at DESC
       LIMIT ? OFFSET ?"
    );
    $allBindings = array_merge($bindings, [$perPage, $offset]);
    $stmt->execute($allBindings);
    $posts = $stmt->fetchAll();

    foreach ($posts as &$p) {
      $p['id'] = (int)$p['id'];
      $p['is_featured'] = (bool)$p['is_featured'];
      $p['view_count'] = (int)$p['view_count'];
    }

    Response::success([
      'data' => $posts,
      'total' => $total,
      'page' => $page,
      'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ], 'Agent blog posts retrieved');
  }

  /**
   * Create a new blog post.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function store(array $params): void
  {
    AuthMiddleware::authenticateAgent();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->required('title', 'Title')
      ->required('content', 'Content')
      ->string('title', 'Title', 255)
      ->string('excerpt', 'Excerpt', 500);

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $slug = self::generateSlug($data['title']);

    $db = Database::getConnection();

    // Ensure unique slug
    $baseSlug = $slug;
    $counter = 1;
    $stmt = $db->prepare("SELECT COUNT(*) FROM blog_posts WHERE slug = ?");
    while (true) {
      $stmt->execute([$slug]);
      if ((int)$stmt->fetchColumn() === 0) break;
      $slug = $baseSlug . '-' . $counter++;
    }

    $stmt = $db->prepare(
      "INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, author_name, author_id, category_id, status, tags, meta_title, meta_description, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    $status = $data['status'] ?? 'draft';
    $publishedAt = $status === 'published' ? date('Y-m-d H:i:s') : null;

    $stmt->execute([
      $data['title'],
      $slug,
      $data['excerpt'] ?? null,
      $data['content'],
      $data['featured_image'] ?? null,
      $data['author_name'] ?? 'AVR Homes',
      $data['author_id'] ?? null,
      $data['category_id'] ?? null,
      $status,
      json_encode($data['tags'] ?? []),
      $data['meta_title'] ?? null,
      $data['meta_description'] ?? null,
      $publishedAt,
    ]);

    $id = (int)$db->lastInsertId();

    Response::success([
      'id' => $id,
      'slug' => $slug,
    ], 'Blog post created', 201);
  }

  /**
   * Update a blog post.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function update(array $params): void
  {
    AuthMiddleware::authenticateAgent();

    $id = (int)($params['id'] ?? 0);
    if (!$id) {
      Response::error('Post ID is required', 400);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $db = Database::getConnection();

    $stmt = $db->prepare("SELECT * FROM blog_posts WHERE id = ?");
    $stmt->execute([$id]);
    $post = $stmt->fetch();

    if (!$post) {
      Response::error('Post not found', 404);
    }

    $fields = [];
    $bindings = [];

    foreach (['title', 'excerpt', 'content', 'featured_image', 'author_name', 'category_id', 'tags', 'meta_title', 'meta_description', 'is_featured'] as $field) {
      if (isset($input[$field])) {
        if ($field === 'tags') {
          $fields[] = "tags = ?";
          $bindings[] = json_encode($input[$field]);
        } elseif ($field === 'is_featured') {
          $fields[] = "is_featured = ?";
          $bindings[] = $input[$field] ? 1 : 0;
        } else {
          $fields[] = "{$field} = ?";
          $bindings[] = $input[$field];
        }
      }
    }

    if (isset($input['status'])) {
      $fields[] = "status = ?";
      $bindings[] = $input['status'];
      if ($input['status'] === 'published' && !$post['published_at']) {
        $fields[] = "published_at = NOW()";
      }
    }

    if (empty($fields)) {
      Response::error('No fields to update', 400);
    }

    $bindings[] = $id;
    $db->prepare("UPDATE blog_posts SET " . implode(', ', $fields) . " WHERE id = ?")->execute($bindings);

    Response::success(['id' => $id], 'Blog post updated');
  }

  /**
   * Delete a blog post.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function destroy(array $params): void
  {
    AuthMiddleware::authenticateAgent();

    $id = (int)($params['id'] ?? 0);
    if (!$id) {
      Response::error('Post ID is required', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare("DELETE FROM blog_posts WHERE id = ?");
    $stmt->execute([$id]);

    Response::success(null, 'Blog post deleted');
  }

  // ---- Helpers ----

  /**
   * Generate a URL-friendly slug from a title string.
   *
   * @param string $title The post title.
   * @return string The generated slug.
   */
  private static function generateSlug(string $title): string
  {
    $slug = strtolower(trim($title));
    $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug);
    $slug = preg_replace('/[\s-]+/', '-', $slug);
    $slug = trim($slug, '-');
    return $slug ?: 'post';
  }
}
