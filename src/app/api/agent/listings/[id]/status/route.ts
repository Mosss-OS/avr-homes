/**
 * PUT /api/agent/listings/{id}/status — update a listing's status (draft / published / archived) (agent only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { getClientIp } from "@/server/rate-limiter";
import { checkListingLimit } from "@/server/subscription";

export const runtime = "nodejs";

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

  const input = await readJson(req);
  if (!input || input.status === undefined) {
    return error("Status is required", 400);
  }

  const validStatuses = ["draft", "published", "archived"];
  if (!validStatuses.includes(input.status)) {
    return error("Invalid status. Must be: draft, published, archived", 422);
  }

  const existing = await fetchOne("SELECT id, is_active FROM properties WHERE id = ? AND agent_id = ?", [propertyId, agentId]);
  if (!existing) {
    return error("Listing not found or access denied", 404);
  }

  const isActive = input.status === "published" ? 1 : input.status === "archived" ? 2 : 0;

  if (input.status === "published" && Number(existing.is_active) !== 1) {
    const limitError = await checkListingLimit(user.id);
    if (limitError) return limitError;
  }

  await execute("UPDATE properties SET is_active = ?, updated_at = NOW() WHERE id = ?", [isActive, propertyId]);

  await execute(
    "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)",
    [user.id, `${input.status}_listing`, "property", propertyId, getClientIp(req)]
  );

  return success({ id: propertyId, status: input.status }, `Listing ${input.status} successfully`);
}

async function getAgentId(user: any): Promise<number | NextResponse> {
  if (user.agent_id) return Number(user.agent_id);
  const agent = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
  if (!agent) {
    return error("Agent profile not found. Complete your profile first.", 404);
  }
  return Number(agent.id);
}
