/**
 * PUT /api/agent/progress/{id} — update a progress update.
 * DELETE /api/agent/progress/{id} — delete a progress update.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agentId = await getAgentId(user);
  if (agentId instanceof NextResponse) return agentId;

  const { id } = await params;
  const progressId = Number(id);
  if (!progressId || progressId <= 0) {
    return error("Progress ID is required", 400);
  }

  const input = await readJson(req);

  const owned = await fetchOne(
    `SELECT op.id FROM off_plan_progress op
     JOIN properties p ON p.id = op.property_id
     WHERE op.id = ? AND p.agent_id = ?`,
    [progressId, agentId]
  );
  if (!owned) {
    return error("Progress update not found or not yours", 404);
  }

  const fields: string[] = [];
  const bindings: unknown[] = [];

  for (const field of ["month_number", "title", "description"]) {
    if (input[field] !== undefined) {
      fields.push(`${field} = ?`);
      bindings.push(input[field]);
    }
  }
  if (input.images !== undefined) {
    fields.push("images = ?");
    bindings.push(JSON.stringify(input.images));
  }
  if (input.videos !== undefined) {
    fields.push("videos = ?");
    bindings.push(JSON.stringify(input.videos));
  }

  if (fields.length === 0) {
    return error("No fields to update", 400);
  }

  bindings.push(progressId);
  await execute(`UPDATE off_plan_progress SET ${fields.join(", ")} WHERE id = ?`, bindings);

  return success({ id: progressId }, "Progress update updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agentId = await getAgentId(user);
  if (agentId instanceof NextResponse) return agentId;

  const { id } = await params;
  const progressId = Number(id);
  if (!progressId || progressId <= 0) {
    return error("Progress ID is required", 400);
  }

  const owned = await fetchOne(
    `SELECT op.id FROM off_plan_progress op
     JOIN properties p ON p.id = op.property_id
     WHERE op.id = ? AND p.agent_id = ?`,
    [progressId, agentId]
  );
  if (!owned) {
    return error("Progress update not found or not yours", 404);
  }

  await execute("DELETE FROM off_plan_progress WHERE id = ?", [progressId]);
  return success(null, "Progress update deleted");
}

async function getAgentId(user: any): Promise<number | NextResponse> {
  if (user.agent_id) return Number(user.agent_id);
  const agent = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
  if (!agent) {
    return error("Agent profile not found. Complete your profile first.", 404);
  }
  return Number(agent.id);
}
