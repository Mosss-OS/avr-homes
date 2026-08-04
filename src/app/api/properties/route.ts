/**
 * GET /api/properties — list/search properties with filtering, pagination,
 * and sorting.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { Validator } from "@/server/validator";
import { findAll, findById, create, type PropertyFilters } from "@/server/models/property";
import { readJson } from "@/server/http";
import { execute, fetchOne } from "@/server/db";
import { getClientIp } from "@/server/rate-limiter";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;

  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 12)));
  const sort = sp.get("sort") ?? "created_at";
  const order = sp.get("order") ?? "desc";

  const filters: PropertyFilters = {
    purpose: sp.get("purpose"),
    type: sp.get("type"),
    city: sp.get("city"),
    community: sp.get("community"),
    min_price: sp.get("min_price"),
    max_price: sp.get("max_price"),
    beds: sp.get("beds"),
    baths: sp.get("baths"),
    featured: sp.get("featured"),
    q: sp.get("q"),
    ids: sp.get("ids") ? sp.get("ids")!.split(",").filter(Boolean) : null,
  };

  const result = await findAll(filters, page, perPage, sort, order);
  return success(result, "Properties retrieved successfully");
}

/**
 * POST /api/properties — create a new property listing (agent or admin).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateAgent(req);
  if (!isUser(authResult)) return authResult as NextResponse;
  const user = authResult;
  const isAdmin = user.role === "admin" || user.role === "superadmin";

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("title", "Title")
    .required("description", "Description")
    .required("type", "Type")
    .inArray("type", ["apartment", "villa", "townhouse", "penthouse", "studio"], "Type")
    .required("purpose", "Purpose")
    .inArray("purpose", ["buy", "rent", "shortlet"], "Purpose")
    .required("price", "Price")
    .numeric("price", "Price")
    .required("city", "City")
    .required("address", "Address")
    .required("lat", "Latitude")
    .numeric("lat", "Latitude")
    .required("lng", "Longitude")
    .numeric("lng", "Longitude");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();

  if (!isAdmin) {
    const agent = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
    if (!agent) {
      return error("Agent profile not found. Complete your agent profile first.", 403);
    }
    data.agent_id = Number(agent.id);
    data.featured = false;
    data.is_verified = false;
  }

  const propertyId = await create(data);

  await execute(
    "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)",
    [user.id, "create_property", "property", propertyId, getClientIp(req)]
  );

  const property = await findById(propertyId);
  return success(property, "Property created successfully", 201);
}
