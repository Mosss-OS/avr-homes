/**
 * GET /api/properties/[id] — show a single property by ID.
 * PUT /api/properties/[id] — update an existing property listing.
 * DELETE /api/properties/[id] — delete a property listing.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { error, success } from "@/server/response";
import { findById, update, deleteProperty } from "@/server/models/property";
import { authenticateAgent, isUser } from "@/server/auth";
import { Validator } from "@/server/validator";
import { readJson } from "@/server/http";
import { execute, fetchOne } from "@/server/db";
import { getClientIp } from "@/server/rate-limiter";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const propertyId = Number(id);
  if (!propertyId || propertyId <= 0) {
    return error("Invalid property ID", 400);
  }

  const property = await findById(propertyId);
  if (!property) {
    return error("Property not found", 404);
  }

  return success(property, "Property retrieved successfully");
}

/** Check whether the authenticated user owns the given property listing. */
async function ownsProperty(user: { id: number }, agentId: number): Promise<boolean> {
  if (agentId <= 0) return false;
  const agent = await fetchOne("SELECT id FROM agents WHERE id = ? AND user_id = ? AND is_active = 1", [
    agentId,
    user.id,
  ]);
  return Boolean(agent);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const authResult = await authenticateAgent(req);
  if (!isUser(authResult)) return authResult as NextResponse;
  const user = authResult;
  const isAdmin = user.role === "admin" || user.role === "superadmin";

  const { id } = await params;
  const propertyId = Number(id);
  if (!propertyId || propertyId <= 0) {
    return error("Invalid property ID", 400);
  }

  const existing = await findById(propertyId);
  if (!existing) {
    return error("Property not found", 404);
  }

  if (!isAdmin && !(await ownsProperty(user, Number(existing.agent_id ?? 0)))) {
    return error("You can only edit your own property listings", 403);
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

  await update(propertyId, input);

  await execute(
    "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)",
    [user.id, "update_property", "property", propertyId, getClientIp(req)]
  );

  const property = await findById(propertyId);
  return success(property, "Property updated successfully");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const authResult = await authenticateAgent(req);
  if (!isUser(authResult)) return authResult as NextResponse;
  const user = authResult;
  const isAdmin = user.role === "admin" || user.role === "superadmin";

  const { id } = await params;
  const propertyId = Number(id);
  if (!propertyId || propertyId <= 0) {
    return error("Invalid property ID", 400);
  }

  const existing = await findById(propertyId);
  if (!existing) {
    return error("Property not found", 404);
  }

  if (!isAdmin && !(await ownsProperty(user, Number(existing.agent_id ?? 0)))) {
    return error("You can only delete your own property listings", 403);
  }

  await deleteProperty(propertyId);

  await execute(
    "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)",
    [user.id, "delete_property", "property", propertyId, getClientIp(req)]
  );

  return success(null, "Property deleted successfully");
}
