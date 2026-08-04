/**
 * GET /api/agent/leads — list leads (inquiries) for the authenticated agent with filtering and pagination.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agentId = await getAgentId(user);
  if (agentId instanceof NextResponse) return agentId;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const status = sp.get("status") ?? null;
  const property = sp.get("property_id") ? Number(sp.get("property_id")) : null;
  const dateFrom = sp.get("date_from") ?? null;
  const dateTo = sp.get("date_to") ?? null;
  const search = sp.get("search") ?? null;

  const conditions = ["p.agent_id = ?"];
  const bindings: any[] = [agentId];

  if (status && ["new", "contacted", "qualified", "closed"].includes(status)) {
    conditions.push("i.status = ?");
    bindings.push(status);
  }

  if (property) {
    conditions.push("i.property_id = ?");
    bindings.push(property);
  }

  if (dateFrom) {
    conditions.push("i.created_at >= ?");
    bindings.push(`${dateFrom} 00:00:00`);
  }

  if (dateTo) {
    conditions.push("i.created_at <= ?");
    bindings.push(`${dateTo} 23:59:59`);
  }

  if (search) {
    conditions.push("(i.name LIKE ? OR i.email LIKE ? OR i.phone LIKE ? OR i.message LIKE ?)");
    const s = `%${search}%`;
    bindings.push(s, s, s, s);
  }

  const where = "WHERE " + conditions.join(" AND ");

  const countRows = (await query(
    `SELECT COUNT(*) as c FROM inquiries i JOIN properties p ON i.property_id = p.id ${where}`,
    bindings
  )) as any[];
  const total = Number(countRows[0]?.c ?? 0);

  const offset = (page - 1) * perPage;
  const leads = (await query(
    `SELECT i.*, p.title as property_title, p.slug as property_slug,
            p.type as property_type, p.purpose as property_purpose,
            p.price as property_price, p.image as property_image,
            p.city as property_city, p.community as property_community
     FROM inquiries i
     JOIN properties p ON i.property_id = p.id
     ${where}
     ORDER BY i.created_at DESC
     LIMIT ${perPage} OFFSET ${offset}`,
    bindings
  )) as any[];

  const formattedLeads = leads.map((lead) => ({
    ...lead,
    id: Number(lead.id),
    property_id: lead.property_id ? Number(lead.property_id) : null,
    is_read: Boolean(lead.is_read),
    property_price: lead.property_price ? Number(lead.property_price) : null,
  }));

  return success(
    {
      data: formattedLeads,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Leads retrieved successfully"
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
