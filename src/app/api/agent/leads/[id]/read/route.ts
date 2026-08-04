/**
 * PUT /api/agent/leads/[id]/read — mark a lead as read (agent only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agentId = await getAgentId(user);
  if (agentId instanceof NextResponse) return agentId;

  const { id } = await params;
  const leadId = Number(id);
  if (!leadId || leadId <= 0) {
    return error("Invalid lead ID", 400);
  }

  const result = await execute(
    "UPDATE inquiries i JOIN properties p ON i.property_id = p.id SET i.is_read = 1 WHERE i.id = ? AND p.agent_id = ?",
    [leadId, agentId]
  );

  if (result.affectedRows === 0) {
    return error("Lead not found or access denied", 404);
  }

  return success({ id: leadId, is_read: true }, "Lead marked as read");
}

async function getAgentId(user: any): Promise<number | NextResponse> {
  if (user.agent_id) return Number(user.agent_id);
  const agent = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
  if (!agent) {
    return error("Agent profile not found. Complete your profile first.", 404);
  }
  return Number(agent.id);
}
