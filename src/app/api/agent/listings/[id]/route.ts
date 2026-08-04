/**
 * GET /api/agent/listings/{id} — show a single property listing (agent only).
 * PUT /api/agent/listings/{id} — update an existing property listing (agent only).
 * DELETE /api/agent/listings/{id} — delete a property listing (agent only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";
import { getClientIp } from "@/server/rate-limiter";
import { getImages, getVideos } from "@/server/models/property";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agentId = await getAgentId(user);
  if (agentId instanceof NextResponse) return agentId;

  const { id } = await params;
  const propertyId = Number(id);
  if (!propertyId || propertyId <= 0) {
    return error("Invalid listing ID", 400);
  }

  const property = await fetchOne("SELECT p.* FROM properties p WHERE p.id = ? AND p.agent_id = ?", [propertyId, agentId]);
  if (!property) {
    return error("Listing not found or access denied", 404);
  }

  property.id = Number(property.id);
  property.price = Number(property.price);
  property.beds = Number(property.beds);
  property.baths = Number(property.baths);
  property.area = Number(property.area);
  property.featured = Boolean(property.featured);
  property.is_verified = Boolean(property.is_verified);
  property.amenities = safeJson(property.amenities, []);
  property.images = await getImages(propertyId);
  property.videos = await getVideos(propertyId);

  return success(property, "Listing retrieved successfully");
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agentId = await getAgentId(user);
  if (agentId instanceof NextResponse) return agentId;

  const { id } = await params;
  const propertyId = Number(id);
  if (!propertyId || propertyId <= 0) {
    return error("Invalid listing ID", 400);
  }

  const existing = await fetchOne("SELECT id, is_active FROM properties WHERE id = ? AND agent_id = ?", [propertyId, agentId]);
  if (!existing) {
    return error("Listing not found or access denied", 404);
  }

  const input = await readJson(req);
  if (Object.keys(input).length === 0) {
    return error("No data provided for update", 400);
  }

  const validator = new Validator(input);
  if (input.type !== undefined) {
    validator.inArray("type", ["apartment", "villa", "townhouse", "penthouse", "studio"], "Type");
  }
  if (input.purpose !== undefined) {
    validator.inArray("purpose", ["buy", "rent", "shortlet"], "Purpose");
  }
  if (input.price !== undefined) {
    validator.numeric("price", "Price");
  }
  if (input.lat !== undefined) {
    validator.numeric("lat", "Latitude");
  }
  if (input.lng !== undefined) {
    validator.numeric("lng", "Longitude");
  }

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const fields: string[] = [];
  const updateParams: any[] = [];

  const allowed = [
    "title", "description", "type", "purpose", "price", "nightly_price", "min_stay", "max_stay", "beds", "baths",
    "area", "city", "community", "address", "lat", "lng", "image", "video_url",
    "virtual_tour_url", "floor_plan_url", "amenities", "featured", "is_off_plan", "completion_date",
  ];

  for (const field of allowed) {
    if (!(field in input)) continue;
    if (field === "amenities") {
      fields.push(`${field} = ?`);
      updateParams.push(JSON.stringify(input[field]));
    } else if (field === "featured" || field === "is_off_plan") {
      fields.push(`${field} = ?`);
      updateParams.push(!empty(input[field]) ? 1 : 0);
    } else if (["price", "nightly_price", "min_stay", "max_stay", "beds", "baths", "area"].includes(field)) {
      if (field === "price" && input[field] === "") continue;
      fields.push(`${field} = ?`);
      const value = input[field];
      if (field === "min_stay" && (value === "" || value === null)) {
        updateParams.push(1);
      } else if (value === "" || value === null) {
        updateParams.push(null);
      } else {
        updateParams.push(Number(value));
      }
    } else if (field === "completion_date") {
      fields.push(`${field} = ?`);
      updateParams.push(input[field] === "" || input[field] === null ? null : input[field]);
    } else if (field === "lat" || field === "lng") {
      fields.push(`${field} = ?`);
      updateParams.push(Number(input[field]));
    } else {
      fields.push(`${field} = ?`);
      updateParams.push(input[field]);
    }
  }

  if (input.title !== undefined) {
    fields.push("slug = ?");
    updateParams.push(await generateSlug(String(input.title), propertyId));
  }

  if (input.status !== undefined) {
    fields.push("is_active = ?");
    updateParams.push(input.status === "published" ? 1 : input.status === "archived" ? 2 : 0);
  }

  if (fields.length === 0) {
    return error("No valid fields to update", 400);
  }

  fields.push("updated_at = NOW()");
  updateParams.push(propertyId);

  await execute(`UPDATE properties SET ${fields.join(", ")} WHERE id = ?`, updateParams);

  await execute(
    "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)",
    [user.id, "update_listing", "property", propertyId, getClientIp(req)]
  );

  const property = await fetchOne("SELECT p.* FROM properties p WHERE p.id = ?", [propertyId]);

  property.id = Number(property.id);
  property.price = Number(property.price);
  property.beds = Number(property.beds);
  property.baths = Number(property.baths);
  property.area = Number(property.area);
  property.featured = Boolean(property.featured);
  property.is_verified = Boolean(property.is_verified);
  property.amenities = safeJson(property.amenities, []);

  return success(property, "Listing updated successfully");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agentId = await getAgentId(user);
  if (agentId instanceof NextResponse) return agentId;

  const { id } = await params;
  const propertyId = Number(id);
  if (!propertyId || propertyId <= 0) {
    return error("Invalid listing ID", 400);
  }

  const existing = await fetchOne("SELECT id FROM properties WHERE id = ? AND agent_id = ?", [propertyId, agentId]);
  if (!existing) {
    return error("Listing not found or access denied", 404);
  }

  await execute("DELETE FROM properties WHERE id = ?", [propertyId]);

  await execute(
    "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)",
    [user.id, "delete_listing", "property", propertyId, getClientIp(req)]
  );

  return success(null, "Listing deleted successfully");
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

async function generateSlug(title: string, excludeId: number): Promise<string> {
  let slug = String(title).trim().toLowerCase();
  slug = slug.replace(/[^a-z0-9\s-]/g, "");
  slug = slug.replace(/[\s-]+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");

  const original = slug;
  let counter = 1;
  while (true) {
    const row = await fetchOne("SELECT COUNT(*) AS c FROM properties WHERE slug = ? AND id != ?", [slug, excludeId]);
    if (Number(row?.c ?? 0) === 0) break;
    slug = `${original}-${counter}`;
    counter++;
  }
  return slug;
}
