/**
 * GET /api/agent/leads/[id] — get a single lead (agent only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
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

  const lead = await fetchOne(
    "SELECT i.*, p.title as property_title, p.slug as property_slug, p.type as property_type, p.purpose as property_purpose, p.price as property_price, p.image as property_image, p.city as property_city, p.community as property_community, p.address as property_address, p.beds as property_beds, p.baths as property_baths, p.area as property_area FROM inquiries i JOIN properties p ON i.property_id = p.id WHERE i.id = ? AND p.agent_id = ?",
    [leadId, agentId]
  );

  if (!lead) {
    return error("Lead not found or access denied", 404);
  }

  lead.id = Number(lead.id);
  lead.property_id = lead.property_id ? Number(lead.property_id) : null;
  lead.is_read = Boolean(lead.is_read);
  lead.property_price = lead.property_price ? Number(lead.property_price) : null;

  return success(lead, "Lead retrieved successfully");
}

async function getAgentId(user: any): Promise<number | NextResponse> {
  if (user.agent_id) return Number(user.agent_id);
  const agent = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
  if (!agent) {
    return error("Agent profile not found. Complete your profile first.", 404);
  }
  return Number(agent.id);
}
