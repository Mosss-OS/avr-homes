/**
 * GET /api/agent/profile — get the authenticated agent's own profile.
 * PUT /api/agent/profile — update the authenticated agent's profile.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { findById, update } from "@/server/models/agent";
import { fetchOne, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";
import { getClientIp } from "@/server/rate-limiter";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agent = await fetchOne(
    'SELECT a.*, u.email as user_email, u.name as user_name FROM agents a JOIN users u ON u.id = a.user_id WHERE a.user_id = ? AND a.is_active = 1',
    [user.id]
  );

  if (!agent) {
    return error("Agent profile not found", 404);
  }

  for (const jsonField of ["languages", "property_types", "specialization", "support_needed"]) {
    agent[jsonField] = agent[jsonField] ? JSON.parse(agent[jsonField]) : [];
  }

  agent.id = Number(agent.id);
  agent.user_id = Number(agent.user_id);
  agent.listings = Number(agent.listings);
  agent.avatar_hue = Number(agent.avatar_hue);
  agent.is_verified = Boolean(agent.is_verified);
  agent.is_active = Boolean(agent.is_active);

  return success(agent, "Profile retrieved successfully");
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const db = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
  if (!db) {
    return error("Agent profile not found", 404);
  }

  const agentId = Number(db.id);
  const input = await readJson(req);

  const validator = new Validator(input);
  if (input.name !== undefined) {
    validator.string("name", "Full Name", 100);
  }
  if (input.phone !== undefined) {
    validator.string("phone", "Phone Number", 30);
  }
  if (input.experience !== undefined) {
    validator.inArray("experience", ["1-2", "3-5", "6-10", "10+"], "Experience");
  }
  if (input.avg_monthly_listings !== undefined) {
    validator.inArray("avg_monthly_listings", ["1-5", "6-15", "16-30", "30+"], "Avg Monthly Listings");
  }
  if (input.avg_deal_size !== undefined) {
    validator.inArray("avg_deal_size", ["below-10m", "10m-50m", "50m-200m", "200m+"], "Avg Deal Size");
  }

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const updated = await update(agentId, input);

  if (!updated) {
    return error("No fields to update", 400);
  }

  await execute(
    "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)",
    [user.id, "update_profile", "agent", agentId, getClientIp(req)]
  );

  const profile = await findById(agentId);
  return success(profile, "Profile updated successfully");
}
