/**
 * GET /api/agent/listings/stats — get statistics about the agent's property listings.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agentId = await getAgentId(user);
  if (agentId instanceof NextResponse) return agentId;

  const activeRow = await fetchOne("SELECT COUNT(*) AS c FROM properties WHERE agent_id = ? AND is_active = 1", [agentId]);
  const draftsRow = await fetchOne("SELECT COUNT(*) AS c FROM properties WHERE agent_id = ? AND is_active = 0", [agentId]);
  const archivedRow = await fetchOne("SELECT COUNT(*) AS c FROM properties WHERE agent_id = ? AND is_active = 2", [agentId]);

  const unreadRow = await fetchOne(
    "SELECT COUNT(*) AS c FROM inquiries i JOIN properties p ON i.property_id = p.id WHERE p.agent_id = ? AND i.is_read = 0",
    [agentId]
  );

  const active = Number(activeRow?.c ?? 0);
  const drafts = Number(draftsRow?.c ?? 0);
  const archived = Number(archivedRow?.c ?? 0);

  return success(
    {
      active_listings: active,
      draft_listings: drafts,
      archived_listings: archived,
      unread_leads: Number(unreadRow?.c ?? 0),
      total: active + drafts + archived,
    },
    "Stats retrieved successfully"
  );
}

async function getAgentId(user: any): Promise<number | NextResponse> {
  if (user.agent_id) return Number(user.agent_id);
  const agent = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
  if (!agent) {
    return error("Agent profile not found. Complete your profile first.", 404);
  }
  return Number(agent.id);
}
