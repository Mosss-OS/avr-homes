/**
 * Blog model — data access for blog posts.
 *
 * Mirrors the legacy PHP `BlogController` data layer: public listing with
 * category/tag/search filtering, single-post retrieval with related posts,
 * categories, featured posts, and agent/admin CRUD operations.
 *
 * @module server/models/blog
 */

import { fetchAll, fetchOne, execute } from "../db";

/** List published blog posts with pagination, category/tag/search filtering. */
export async function findPublic(page = 1, perPage = 10, filters: { category?: string | null; tag?: string | null; search?: string | null } = {}): Promise<{ data: any[]; total: number; page: number; per_page: number; total_pages: number }> {
  const conditions: string[] = ["status = ?"];
  const bindings: unknown[] = ["published"];

  if (filters.category) {
    conditions.push("bp.category_id = (SELECT id FROM blog_categories WHERE slug = ?)");
    bindings.push(filters.category);
  }
  if (filters.tag) {
    conditions.push("JSON_SEARCH(bp.tags, 'one', ?) IS NOT NULL");
    bindings.push(filters.tag);
  }
  if (filters.search) {
    conditions.push("MATCH(bp.title, bp.excerpt, bp.content) AGAINST(? IN BOOLEAN MODE)");
    bindings.push(filters.search + "*");
  }

  const where = conditions.join(" AND ");

  const countRow = await fetchOne(`SELECT COUNT(*) AS c FROM blog_posts bp WHERE ${where}`, bindings);
  const total = Number(countRow?.c ?? 0);

  const offset = (page - 1) * perPage;
  const posts = await fetchAll(
    `SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.featured_image, bp.author_name,
            bp.category_id, bc.name as category_name, bc.slug as category_slug,
            bp.published_at, bp.tags, bp.is_featured, bp.view_count
     FROM blog_posts bp
     LEFT JOIN blog_categories bc ON bc.id = bp.category_id
     WHERE ${where}
     ORDER BY bp.is_featured DESC, bp.published_at DESC
     LIMIT ${perPage} OFFSET ${offset}`,
    bindings
  );

  for (const post of posts) {
    post.id = Number(post.id);
    post.tags = safeJson(post.tags, []);
    post.is_featured = Boolean(post.is_featured);
    post.view_count = Number(post.view_count);
  }

  return { data: posts, total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) };
}

/** Get a single published blog post by slug with related posts. */
export async function findBySlug(slug: string): Promise<{ post: any; related: any[] } | null> {
  await execute("UPDATE blog_posts SET view_count = view_count + 1 WHERE slug = ?", [slug]);

  const post = await fetchOne(
    `SELECT bp.*, bc.name as category_name, bc.slug as category_slug
     FROM blog_posts bp
     LEFT JOIN blog_categories bc ON bc.id = bp.category_id
     WHERE bp.slug = ? AND bp.status = 'published'
     LIMIT 1`,
    [slug]
  );

  if (!post) return null;

  post.id = Number(post.id);
  post.category_id = post.category_id ? Number(post.category_id) : null;
  post.tags = safeJson(post.tags, []);
  post.is_featured = Boolean(post.is_featured);
  post.view_count = Number(post.view_count);
  delete post.status;

  const related = await fetchAll(
    `SELECT id, title, slug, excerpt, featured_image, published_at
     FROM blog_posts
     WHERE category_id = ? AND id != ? AND status = 'published'
     ORDER BY published_at DESC LIMIT 3`,
    [post.category_id, post.id]
  );
  for (const r of related) {
    r.id = Number(r.id);
  }

  return { post, related };
}

/** List all blog categories with their published post count. */
export async function findCategories(): Promise<any[]> {
  const categories = await fetchAll(
    `SELECT bc.*, COUNT(bp.id) as post_count
     FROM blog_categories bc
     LEFT JOIN blog_posts bp ON bp.category_id = bc.id AND bp.status = 'published'
     GROUP BY bc.id
     ORDER BY bc.name ASC`
  );
  for (const c of categories) {
    c.id = Number(c.id);
    c.post_count = Number(c.post_count);
  }
  return categories;
}

/** List featured blog posts (max 6). */
export async function findFeatured(): Promise<any[]> {
  const posts = await fetchAll(
    `SELECT id, title, slug, excerpt, featured_image, author_name, category_id, published_at
     FROM blog_posts
     WHERE status = 'published' AND is_featured = 1
     ORDER BY published_at DESC LIMIT 6`
  );
  for (const p of posts) {
    p.id = Number(p.id);
  }
  return posts;
}

/** List blog posts for agents/admins with pagination and status filter. */
export async function findAgentIndex(page = 1, perPage = 20, status?: string | null): Promise<{ data: any[]; total: number; page: number; per_page: number; total_pages: number }> {
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (status) {
    conditions.push("bp.status = ?");
    bindings.push(status);
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countRow = await fetchOne(`SELECT COUNT(*) AS c FROM blog_posts bp ${where}`, bindings);
  const total = Number(countRow?.c ?? 0);

  const offset = (page - 1) * perPage;
  const posts = await fetchAll(
    `SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.status, bp.is_featured,
            bp.published_at, bp.view_count, bp.created_at, bp.updated_at,
            bc.name as category_name
     FROM blog_posts bp
     LEFT JOIN blog_categories bc ON bc.id = bp.category_id
     ${where}
     ORDER BY bp.updated_at DESC
     LIMIT ${perPage} OFFSET ${offset}`,
    bindings
  );

  for (const p of posts) {
    p.id = Number(p.id);
    p.is_featured = Boolean(p.is_featured);
    p.view_count = Number(p.view_count);
  }

  return { data: posts, total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) };
}

/** Create a new blog post. Returns { id, slug }. */
export async function create(data: Record<string, any>, userId: number, isAdmin: boolean): Promise<{ id: number; slug: string }> {
  let slug = await generateSlug(String(data.title ?? "post"));
  const baseSlug = slug;
  let counter = 1;
  while (true) {
    const row = await fetchOne("SELECT COUNT(*) AS c FROM blog_posts WHERE slug = ?", [slug]);
    if (Number(row?.c ?? 0) === 0) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const status = isAdmin ? (data.status ?? "draft") : "pending";
  const publishedAt = status === "published" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null;

  const result = await execute(
    `INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, author_name, author_id, category_id, status, tags, meta_title, meta_description, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      slug,
      data.excerpt ?? null,
      data.content,
      data.featured_image ?? null,
      data.author_name ?? "AVR Homes",
      isAdmin ? (data.author_id ?? null) : userId,
      data.category_id ?? null,
      status,
      JSON.stringify(data.tags ?? []),
      data.meta_title ?? null,
      data.meta_description ?? null,
      publishedAt,
    ]
  );

  return { id: Number(result.insertId), slug };
}

/** Update a blog post (author-scoped for non-admins). Returns error info or success id. */
export async function update(id: number, data: Record<string, any>, userId: number, isAdmin: boolean): Promise<{ ok: boolean; status?: number; message?: string }> {
  const post = await fetchOne("SELECT * FROM blog_posts WHERE id = ?", [id]);
  if (!post) {
    return { ok: false, status: 404, message: "Post not found" };
  }

  if (!isAdmin && Number(post.author_id) !== userId) {
    return { ok: false, status: 403, message: "You can only edit your own blog posts" };
  }

  const fields: string[] = [];
  const bindings: unknown[] = [];

  for (const field of ["title", "excerpt", "content", "featured_image", "author_name", "category_id", "tags", "meta_title", "meta_description"]) {
    if (data[field] !== undefined) {
      if (field === "tags") {
        fields.push("tags = ?");
        bindings.push(JSON.stringify(data[field]));
      } else {
        fields.push(`${field} = ?`);
        bindings.push(data[field]);
      }
    }
  }

  if (isAdmin && data.is_featured !== undefined) {
    fields.push("is_featured = ?");
    bindings.push(data.is_featured ? 1 : 0);
  }

  if (data.status !== undefined) {
    const newStatus = isAdmin ? data.status : "pending";
    fields.push("status = ?");
    bindings.push(newStatus);
    if (newStatus === "published" && !post.published_at) {
      fields.push("published_at = NOW()");
    }
  }

  if (fields.length === 0) {
    return { ok: false, status: 400, message: "No fields to update" };
  }

  bindings.push(id);
  await execute(`UPDATE blog_posts SET ${fields.join(", ")} WHERE id = ?`, bindings);

  return { ok: true, status: 200, message: "Blog post updated" };
}

/** Delete a blog post (author-scoped for non-admins). */
export async function remove(id: number, userId: number, isAdmin: boolean): Promise<{ ok: boolean; status?: number; message?: string }> {
  if (!isAdmin) {
    const row = await fetchOne("SELECT author_id FROM blog_posts WHERE id = ?", [id]);
    const authorId = row?.author_id;
    if (Number(authorId) !== userId) {
      return { ok: false, status: 403, message: "You can only delete your own blog posts" };
    }
  }

  await execute("DELETE FROM blog_posts WHERE id = ?", [id]);
  return { ok: true, status: 200, message: "Blog post deleted" };
}

/** Generate a URL-friendly slug from a title string. */
export async function generateSlug(title: string): Promise<string> {
  let slug = String(title).trim().toLowerCase();
  slug = slug.replace(/[^a-z0-9\s-]/g, "");
  slug = slug.replace(/[\s-]+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");
  return slug || "post";
}

function safeJson(value: unknown, fallback: unknown): unknown {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value as string);
  } catch {
    return fallback;
  }
}
