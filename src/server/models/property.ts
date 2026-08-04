/**
 * Property model — data access for property listings.
 *
 * Mirrors the legacy PHP `Property` class: full-text search, filtering,
 * pagination, sorting, image retrieval, and CRUD operations.
 *
 * @module server/models/property
 */

import { fetchAll, fetchOne, execute, query } from "../db";

export interface PropertyFilters {
  purpose?: string | null;
  type?: string | null;
  city?: string | null;
  community?: string | null;
  min_price?: string | null;
  max_price?: string | null;
  beds?: string | null;
  baths?: string | null;
  featured?: string | null;
  q?: string | null;
  ids?: string[] | null;
}

/** Search and paginate active properties with optional filters. */
export async function findAll(
  filters: PropertyFilters = {},
  page = 1,
  perPage = 12,
  sort = "created_at",
  order = "desc"
): Promise<{ data: any[]; total: number; page: number; per_page: number; total_pages: number }> {
  const conditions: string[] = ["p.is_active = 1"];
  const params: unknown[] = [];

  if (filters.purpose) {
    conditions.push("p.purpose = ?");
    params.push(filters.purpose);
  }

  if (filters.type) {
    conditions.push("p.type = ?");
    params.push(filters.type);
  }

  if (filters.city) {
    conditions.push("p.city LIKE ?");
    params.push(`%${filters.city}%`);
  }

  if (filters.community) {
    conditions.push("p.community LIKE ?");
    params.push(`%${filters.community}%`);
  }

  if (filters.min_price) {
    conditions.push("p.price >= ?");
    params.push(Number(filters.min_price));
  }

  if (filters.max_price) {
    conditions.push("p.price <= ?");
    params.push(Number(filters.max_price));
  }

  if (filters.beds) {
    conditions.push("p.beds >= ?");
    params.push(Number(filters.beds));
  }

  if (filters.baths) {
    conditions.push("p.baths >= ?");
    params.push(Number(filters.baths));
  }

  if (filters.featured) {
    conditions.push("p.featured = 1");
  }

  if (filters.q) {
    conditions.push("MATCH(p.title, p.description, p.address, p.community) AGAINST(? IN BOOLEAN MODE)");
    params.push(filters.q);
  }

  if (filters.ids && filters.ids.length > 0) {
    const placeholders = filters.ids.map(() => "?").join(", ");
    conditions.push(`p.id IN (${placeholders})`);
    params.push(...filters.ids);
  }

  const where = conditions.join(" AND ");

  const countRow = await fetchOne(`SELECT COUNT(*) AS c FROM properties p WHERE ${where}`, params);
  const total = Number(countRow?.c ?? 0);

  const allowedSort = ["price", "created_at", "title", "area", "beds", "posted_days_ago"];
  const sortCol = allowedSort.includes(sort) ? sort : "created_at";
  const orderDir = order.toLowerCase() === "asc" ? "ASC" : "DESC";

  const offset = (page - 1) * perPage;
  const properties = await fetchAll(
    `SELECT p.*, a.name as agent_name, a.agency as agent_agency,
      a.phone as agent_phone, a.email as agent_email, a.avatar_hue as agent_avatar_hue,
      a.languages as agent_languages, a.is_verified as agent_is_verified
     FROM properties p
     LEFT JOIN agents a ON p.agent_id = a.id
     WHERE ${where}
     ORDER BY p.${sortCol} ${orderDir}
     LIMIT ${perPage} OFFSET ${offset}`,
    params
  );

  const data: any[] = [];
  for (const property of properties) {
    data.push(await formatListRow(property));
  }

  return {
    data,
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  };
}

/** Find a property by primary key, including agent info and images. */
export async function findById(id: number): Promise<any | null> {
  const property = await fetchOne(
    `SELECT p.*, a.name as agent_name, a.agency as agent_agency,
      a.phone as agent_phone, a.email as agent_email, a.avatar_hue as agent_avatar_hue,
      a.languages as agent_languages, a.bio as agent_bio, a.is_verified as agent_is_verified
     FROM properties p
     LEFT JOIN agents a ON p.agent_id = a.id
     WHERE p.id = ? AND p.is_active = 1`,
    [id]
  );

  if (!property) return null;

  return formatDetailRow(property);
}

/** Insert a new property record and return the new property ID. */
export async function create(data: Record<string, any>): Promise<number> {
  const slug = await generateSlug(String(data.title));

  const result = await execute(
    `INSERT INTO properties (title, slug, description, type, purpose, price, nightly_price, min_stay, max_stay, beds, baths,
      area, city, community, address, lat, lng, amenities, agent_id, featured, is_verified, is_off_plan, completion_date, posted_days_ago)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      data.title,
      slug,
      data.description,
      data.type,
      data.purpose,
      Number(data.price),
      data.nightly_price !== undefined && data.nightly_price !== "" && data.nightly_price !== null
        ? Number(data.nightly_price)
        : null,
      Number(data.min_stay ?? 1),
      data.max_stay !== undefined && data.max_stay !== "" && data.max_stay !== null ? Number(data.max_stay) : null,
      Number(data.beds ?? 0),
      Number(data.baths ?? 0),
      Number(data.area ?? 0),
      data.city,
      data.community ?? "",
      data.address,
      Number(data.lat),
      Number(data.lng),
      JSON.stringify(data.amenities ?? []),
      data.agent_id ? Number(data.agent_id) : null,
      data.featured ? 1 : 0,
      data.is_verified ? 1 : 0,
      data.is_off_plan ? 1 : 0,
      data.completion_date ?? null,
    ]
  );

  return Number(result.insertId);
}

/** Update a property record, regenerating slug if the title changed. */
export async function update(id: number, data: Record<string, any>): Promise<boolean> {
  const allowed = [
    "title", "description", "type", "purpose", "price", "nightly_price", "min_stay", "max_stay",
    "beds", "baths", "area", "city", "community", "address", "lat", "lng", "image",
    "video_url", "virtual_tour_url", "floor_plan_url",
    "agent_id", "featured", "is_verified", "is_off_plan", "completion_date", "amenities",
  ];

  const sets: string[] = [];
  const params: unknown[] = [];

  for (const field of allowed) {
    if (data[field] === undefined) continue;
    if (field === "amenities") {
      sets.push("amenities = ?");
      params.push(JSON.stringify(data[field]));
    } else if (["featured", "is_verified", "is_off_plan"].includes(field)) {
      sets.push(`${field} = ?`);
      params.push(data[field] ? 1 : 0);
    } else if (["price", "beds", "baths", "area", "agent_id", "nightly_price", "min_stay", "max_stay"].includes(field)) {
      sets.push(`${field} = ?`);
      params.push(data[field] === "" || data[field] === null ? null : Number(data[field]));
    } else if (["lat", "lng"].includes(field)) {
      sets.push(`${field} = ?`);
      params.push(Number(data[field]));
    } else {
      sets.push(`${field} = ?`);
      params.push(data[field]);
    }
  }

  if (sets.length === 0) {
    return false;
  }

  if (data.title !== undefined) {
    sets.push("slug = ?");
    params.push(await generateSlug(String(data.title)));
  }

  params.push(id);
  const result = await execute(`UPDATE properties SET ${sets.join(", ")} WHERE id = ?`, params);
  return result.affectedRows > 0;
}

/** Delete a property record. */
export async function deleteProperty(id: number): Promise<boolean> {
  const result = await execute("DELETE FROM properties WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

let companyDefaultsCache: Record<string, any> | null = null;

/**
 * Default agent fields used to tie a property to the company (AVR Homes)
 * when no agent has been assigned. Reads contact details from the settings
 * table with sensible fallbacks.
 */
export async function companyAgentDefaults(): Promise<Record<string, any>> {
  if (companyDefaultsCache !== null) {
    return companyDefaultsCache;
  }

  const settings: Record<string, string> = {};
  try {
    const rows = await query("SELECT `key`, `value` FROM settings");
    for (const row of rows) {
      settings[row.key] = row.value;
    }
  } catch {
    /* settings table unavailable — fall back below */
  }

  const siteName = settings["site_name"] ?? "AVR Homes";
  const contactEmail = settings["contact_email"] ?? "info@avrusthomes.com";
  const rawPhone = (settings["contact_phone"] ?? "").replace(/[^0-9,]/g, "");
  const phone =
    settings["contact_whatsapp"] ??
    settings["whatsapp_number"] ??
    rawPhone ??
    "2348000000000";

  companyDefaultsCache = {
    agent_id: null,
    agent_name: siteName,
    agent_agency: siteName,
    agent_phone: phone,
    agent_email: contactEmail,
    agent_avatar_hue: 195,
    agent_languages: ["English"],
    agent_is_verified: true,
    agent_bio: null,
  };

  return companyDefaultsCache;
}

/** Retrieve all images for a property, ordered by sort_order / id. */
export async function getImages(propertyId: number): Promise<any[]> {
  const images = await fetchAll(
    "SELECT id, file_path, file_name, is_primary, sort_order FROM property_images WHERE property_id = ? ORDER BY sort_order ASC, id ASC",
    [propertyId]
  );
  for (const image of images) {
    image.id = Number(image.id);
    image.is_primary = Boolean(image.is_primary);
    image.url = imageUrl(image.file_path);
  }
  return images;
}

/** Retrieve all videos for a property, ordered by sort_order / id. */
export async function getVideos(propertyId: number): Promise<any[]> {
  const videos = await fetchAll(
    "SELECT id, file_path, file_name, sort_order, created_at FROM property_videos WHERE property_id = ? ORDER BY sort_order ASC, id ASC",
    [propertyId]
  );
  for (const video of videos) {
    video.id = Number(video.id);
    video.url = imageUrl(video.file_path);
  }
  return videos;
}

/** Resolve a relative image path to a full URL. */
export function imageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${baseUrl}/${path}`;
}

/** Generate a unique URL slug from a property title. */
export async function generateSlug(title: string): Promise<string> {
  let slug = String(title).trim().toLowerCase();
  slug = slug.replace(/[^a-z0-9\s-]/g, "");
  slug = slug.replace(/[\s-]+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");

  const original = slug;
  let counter = 1;
  while (true) {
    const row = await fetchOne("SELECT COUNT(*) AS c FROM properties WHERE slug = ?", [slug]);
    if (Number(row?.c ?? 0) === 0) break;
    slug = `${original}-${counter}`;
    counter++;
  }
  return slug;
}

/** Format a list result row (shared formatting, images included). */
async function formatListRow(property: Record<string, any>): Promise<Record<string, any>> {
  let merged = property;
  if (!property.agent_name) {
    merged = { ...property, ...(await companyAgentDefaults()) };
  }
  return {
    ...merged,
    id: Number(merged.id),
    agent_id: merged.agent_id ? Number(merged.agent_id) : null,
    price: Number(merged.price),
    nightly_price: merged.nightly_price ? Number(merged.nightly_price) : null,
    min_stay: Number(merged.min_stay),
    max_stay: merged.max_stay ? Number(merged.max_stay) : null,
    beds: Number(merged.beds),
    baths: Number(merged.baths),
    area: Number(merged.area),
    featured: Boolean(merged.featured),
    is_verified: Boolean(merged.is_verified),
    is_off_plan: Boolean(merged.is_off_plan),
    post_days_ago: Number(merged.posted_days_ago),
    amenities: safeJson(merged.amenities, []),
    agent_languages: safeJson(merged.agent_languages, []),
    images: await getImages(Number(merged.id)),
  };
}

/** Format a detail result row (shared formatting + videos). */
async function formatDetailRow(property: Record<string, any>): Promise<Record<string, any>> {
  const id = Number(property.id);
  const formatted = await formatListRow(property);
  return { ...formatted, videos: await getVideos(id) };
}

function safeJson(value: unknown, fallback: unknown): unknown {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value as string);
  } catch {
    return fallback;
  }
}
