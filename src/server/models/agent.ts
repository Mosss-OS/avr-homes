/**
 * Agent model — data access for agent profiles.
 *
 * Mirrors the legacy PHP `Agent` class: CRUD operations, slug generation,
 * photo updates, and including related property listings in detail responses.
 *
 * @module server/models/agent
 */

import { fetchAll, fetchOne, execute, query } from "../db";

const PUBLIC_FIELDS =
  "id, slug, photo_url, name, agency, phone, email, whatsapp, languages, listings, avatar_hue, bio, experience, state, city, lasrera_number, niesv_number, avg_monthly_listings, property_types, avg_deal_size, specialization, social_instagram, social_facebook, social_linkedin, social_tiktok, social_youtube, is_verified, created_at";

/** Retrieve all active agents ordered by listing count. */
export async function findAll(): Promise<any[]> {
  const rows = await fetchAll(
    "SELECT id, slug, photo_url, name, agency, phone, email, languages, listings, avatar_hue, bio, is_verified FROM agents WHERE is_active = 1 ORDER BY listings DESC"
  );
  for (const agent of rows) {
    agent.id = Number(agent.id);
    agent.listings = Number(agent.listings);
    agent.avatar_hue = Number(agent.avatar_hue);
    agent.is_verified = Boolean(agent.is_verified);
    agent.languages = safeJson(agent.languages, []);
  }
  return rows;
}

/** Find an active agent by primary key, including their recent properties. */
export async function findById(id: number): Promise<any | null> {
  const agent = await fetchOne(
    "SELECT id, slug, photo_url, name, agency, phone, email, whatsapp, languages, listings, avatar_hue, bio, experience, state, city, lasrera_number, niesv_number, is_verified FROM agents WHERE id = ? AND is_active = 1",
    [id]
  );
  return agent ? formatWithProperties(agent) : null;
}

/** Find an active agent by URL slug, including their recent properties. */
export async function findBySlug(slug: string): Promise<any | null> {
  const agent = await fetchOne(
    "SELECT id, slug, photo_url, name, agency, phone, email, whatsapp, languages, listings, avatar_hue, bio, experience, state, city, lasrera_number, niesv_number, is_verified FROM agents WHERE slug = ? AND is_active = 1",
    [slug]
  );
  return agent ? formatWithProperties(agent) : null;
}

/** Find an active agent by the linked user ID. */
export async function findByUserId(userId: number): Promise<any | null> {
  const agent = await fetchOne("SELECT * FROM agents WHERE user_id = ? AND is_active = 1", [userId]);
  return agent ? format(agent) : null;
}

/** Update an agent's allowed fields and regenerate slug if the name changed. */
export async function update(id: number, data: Record<string, unknown>): Promise<boolean> {
  const allowedFields = [
    "name", "agency", "phone", "whatsapp", "languages", "bio",
    "experience", "state", "city", "lasrera_number", "niesv_number",
    "avg_monthly_listings", "property_types", "avg_deal_size", "specialization",
    "social_instagram", "social_facebook", "social_linkedin", "social_tiktok",
    "social_youtube", "why_join", "support_needed", "referral_source",
  ];

  const sets: string[] = [];
  const bindings: unknown[] = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      let value = data[field];
      if (Array.isArray(value)) {
        value = JSON.stringify(value);
      }
      sets.push(`${field} = ?`);
      bindings.push(value);
    }
  }

  if (data["name"]) {
    const slug = await generateSlug(String(data["name"]));
    sets.push("slug = ?");
    bindings.push(slug);
  }

  if (sets.length === 0) {
    return false;
  }

  bindings.push(id);
  const result = await execute(`UPDATE agents SET ${sets.join(", ")} WHERE id = ?`, bindings);
  return result.affectedRows > 0;
}

/** Update the agent's photo URL. */
export async function updatePhoto(id: number, photoUrl: string): Promise<boolean> {
  const result = await execute("UPDATE agents SET photo_url = ? WHERE id = ?", [photoUrl, id]);
  return result.affectedRows > 0;
}

/**
 * Generate a unique URL slug from an agent name.
 * Appends a numeric suffix if the slug already exists.
 */
export async function generateSlug(name: string): Promise<string> {
  let slug = String(name).trim().toLowerCase();
  slug = slug.replace(/[^a-z0-9\s-]/g, "");
  slug = slug.replace(/[\s-]+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");

  const original = slug;
  let counter = 1;
  while (true) {
    const row = await fetchOne("SELECT COUNT(*) AS c FROM agents WHERE slug = ?", [slug]);
    if (Number(row?.c ?? 0) === 0) {
      break;
    }
    slug = `${original}-${counter}`;
    counter++;
  }
  return slug;
}

/** Format an agent row and attach their latest properties. */
async function formatWithProperties(agent: Record<string, any>): Promise<Record<string, any>> {
  const formatted = format(agent);

  const properties = await fetchAll(
    "SELECT id, title, slug, type, purpose, price, image, city, community, beds, baths, area, featured, is_verified FROM properties WHERE agent_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 20",
    [formatted.id]
  );

  for (const p of properties) {
    p.id = Number(p.id);
    p.price = Number(p.price);
    p.beds = Number(p.beds);
    p.baths = Number(p.baths);
    p.area = Number(p.area);
    p.featured = Boolean(p.featured);
    p.is_verified = Boolean(p.is_verified);
  }

  formatted.properties = properties;
  return formatted;
}

/** Cast agent scalar fields to their proper types and decode JSON columns. */
function format(agent: Record<string, any>): Record<string, any> {
  agent.id = Number(agent.id);
  agent.listings = Number(agent.listings ?? 0);
  agent.avatar_hue = Number(agent.avatar_hue ?? 195);
  agent.is_verified = Boolean(agent.is_verified ?? false);

  for (const jsonField of ["languages", "property_types", "specialization", "support_needed"]) {
    agent[jsonField] = safeJson(agent[jsonField], []);
  }

  return agent;
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
