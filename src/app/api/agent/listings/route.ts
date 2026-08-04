/**
 * GET /api/agent/listings — list the authenticated agent's property listings with pagination and filtering.
 * POST /api/agent/listings — create a new property listing (agent only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, fetchAll, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";
import { getClientIp } from "@/server/rate-limiter";
import { checkListingLimit } from "@/server/subscription";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agentId = await getAgentId(user);
  if (agentId instanceof NextResponse) return agentId;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const status = sp.get("status") ?? null;
  const search = sp.get("q") ?? null;

  const conditions = ["p.agent_id = ?"];
  const params: unknown[] = [agentId];

  if (status) {
    if (status === "draft") {
      conditions.push("p.is_active = 0");
    } else if (status === "archived") {
      conditions.push("p.is_active = 2");
    } else if (status === "published") {
      conditions.push("p.is_active = 1");
    }
  } else {
    conditions.push("p.is_active IN (0, 1)");
  }

  if (search) {
    conditions.push("(p.title LIKE ? OR p.city LIKE ? OR p.community LIKE ?)");
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  const where = conditions.join(" AND ");

  const countRow = await fetchOne(`SELECT COUNT(*) AS c FROM properties p WHERE ${where}`, params);
  const total = Number(countRow?.c ?? 0);

  const offset = (page - 1) * perPage;
  const listings = await fetchAll(
    `SELECT p.id, p.title, p.slug, p.type, p.purpose, p.price, p.nightly_price, p.image,
            p.beds, p.baths, p.area, p.city, p.community, p.is_active, p.featured,
            p.is_verified, p.is_off_plan, p.completion_date, p.posted_days_ago, p.created_at, p.updated_at,
            (SELECT COUNT(*) FROM inquiries WHERE property_id = p.id) as inquiry_count
     FROM properties p
     WHERE ${where}
     ORDER BY p.updated_at DESC
     LIMIT ${perPage} OFFSET ${offset}`,
    params
  );

  const data = listings.map((listing: Record<string, any>) => ({
    ...listing,
    id: Number(listing.id),
    price: Number(listing.price),
    nightly_price: listing.nightly_price !== null && listing.nightly_price !== undefined ? Number(listing.nightly_price) : null,
    beds: Number(listing.beds),
    baths: Number(listing.baths),
    area: Number(listing.area),
    featured: Boolean(listing.featured),
    is_verified: Boolean(listing.is_verified),
    is_off_plan: Boolean(listing.is_off_plan),
    inquiry_count: Number(listing.inquiry_count),
    status: Number(listing.is_active) === 0 ? "draft" : Number(listing.is_active) === 2 ? "archived" : "published",
  }));

  return success(
    {
      data,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Listings retrieved successfully"
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agentId = await getAgentId(user);
  if (agentId instanceof NextResponse) return agentId;

  const limitError = await checkListingLimit(user.id);
  if (limitError) return limitError;

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("title", "Title")
    .required("description", "Description")
    .required("type", "Type")
    .inArray("type", ["apartment", "villa", "townhouse", "penthouse", "studio", "land", "commercial"], "Type")
    .required("purpose", "Purpose")
    .inArray("purpose", ["buy", "rent", "shortlet"], "Purpose")
    .numeric("price", "Price")
    .required("city", "City")
    .required("address", "Address")
    .required("lat", "Latitude")
    .numeric("lat", "Latitude")
    .required("lng", "Longitude")
    .numeric("lng", "Longitude");

  if ((input.purpose ?? "buy") !== "shortlet") {
    validator.required("price", "Price");
  }

  if (input.nightly_price !== undefined) {
    validator.numeric("nightly_price", "Nightly price");
  }
  if (input.min_stay !== undefined) {
    validator.numeric("min_stay", "Minimum stay");
  }

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();
  const slug = await generateSlug(String(data.title));

  const isActive = data.status === "published" ? 1 : 0;

  const priceValue =
    (input.price ?? "") !== "" ? Number(input.price) : Number(input.nightly_price ?? 0);
  const nightlyPrice = (input.nightly_price ?? "") === "" ? null : Number(input.nightly_price);
  const minStay = (input.min_stay ?? "") === "" ? 1 : Number(input.min_stay);
  const maxStay = (input.max_stay ?? "") === "" ? null : Number(input.max_stay);

  const result = await execute(
    `INSERT INTO properties (title, slug, description, type, purpose, price, nightly_price, min_stay, max_stay, beds, baths,
       area, city, community, address, lat, lng, image, video_url, virtual_tour_url, floor_plan_url,
       is_off_plan, completion_date,
       amenities, agent_id, featured, is_verified, is_active, posted_days_ago, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
    [
      data.title,
      slug,
      data.description,
      data.type,
      data.purpose,
      priceValue,
      nightlyPrice,
      minStay,
      maxStay,
      Number(data.beds ?? 0),
      Number(data.baths ?? 0),
      Number(data.area ?? 0),
      data.city,
      data.community ?? "",
      data.address,
      Number(data.lat),
      Number(data.lng),
      data.image ?? null,
      data.video_url ?? null,
      data.virtual_tour_url ?? null,
      data.floor_plan_url ?? null,
      !empty(data.is_off_plan) ? 1 : 0,
      (input.completion_date ?? "") === "" ? null : input.completion_date,
      JSON.stringify(data.amenities ?? []),
      agentId,
      !empty(data.featured) ? 1 : 0,
      0,
      isActive,
    ]
  );

  const propertyId = Number(result.insertId);

  await execute(
    "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)",
    [user.id, "create_listing", "property", propertyId, getClientIp(req)]
  );

  const property = await fetchOne("SELECT p.* FROM properties p WHERE p.id = ?", [propertyId]);

  const formatted = {
    ...property,
    id: Number(property.id),
    price: Number(property.price),
    beds: Number(property.beds),
    baths: Number(property.baths),
    area: Number(property.area),
    featured: Boolean(property.featured),
    is_verified: Boolean(property.is_verified),
    amenities: safeJson(property.amenities, []),
  };

  return success(formatted, "Listing created successfully", 201);
}

async function getAgentId(user: any): Promise<number | NextResponse> {
  if (user.agent_id) return Number(user.agent_id);
  const agent = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
  if (!agent) {
    return error("Agent profile not found. Complete your profile first.", 404);
  }
  return Number(agent.id);
}

function empty(value: unknown): boolean {
  return value === null || value === undefined || value === "" || value === 0 || value === false;
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

async function generateSlug(title: string): Promise<string> {
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
