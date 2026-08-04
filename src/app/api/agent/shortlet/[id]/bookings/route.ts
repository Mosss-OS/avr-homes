/**
 * GET /api/agent/shortlet/[id]/bookings — list bookings for agent's property.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const { id } = await params;
  const propertyId = Number(id);
  if (!propertyId || propertyId <= 0) {
    return error("Invalid property ID", 400);
  }

  const agentId = await resolveAgentId(user);

  const owns = await fetchOne("SELECT id FROM properties WHERE id = ? AND agent_id = ? AND is_active = 1", [propertyId, agentId]);
  if (!owns) {
    return error("Property not found", 404);
  }

  const bookings = (await query(
    "SELECT * FROM property_bookings WHERE property_id = ? ORDER BY check_in DESC LIMIT 50",
    [propertyId]
  )) as any[];

  const formattedBookings = bookings.map((b) => ({
    id: Number(b.id),
    property_id: Number(b.property_id),
    guest_name: b.guest_name,
    guest_email: b.guest_email,
    guest_phone: b.guest_phone,
    check_in: b.check_in,
    check_out: b.check_out,
    guests: Number(b.guests),
    total_price: Number(b.total_price),
    status: b.status,
    created_at: b.created_at,
    updated_at: b.updated_at,
  }));

  return success(formattedBookings, "Bookings retrieved");
}

async function resolveAgentId(user: any): Promise<number> {
  if (user.agent_id) return Number(user.agent_id);
  const agent = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
  if (!agent) {
    throw new Error("Agent profile not found");
  }
  return Number(agent.id);
}
