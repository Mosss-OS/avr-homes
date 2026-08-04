/**
 * PUT /api/agent/shortlet/bookings/[id]/status — update booking status (agent).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, query, execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const { id } = await params;
  const bookingId = Number(id);
  if (!bookingId || bookingId <= 0) {
    return error("Invalid booking ID", 400);
  }

  const input = await readJson(req);
  const status = input.status ?? null;

  if (!["confirmed", "cancelled", "completed"].includes(status)) {
    return error("Invalid status. Use: confirmed, cancelled, completed", 422);
  }

  const agentId = await resolveAgentId(user);

  const booking = await fetchOne(
    "SELECT pb.id FROM property_bookings pb JOIN properties p ON p.id = pb.property_id WHERE pb.id = ? AND p.agent_id = ?",
    [bookingId, agentId]
  );
  if (!booking) {
    return error("Booking not found", 404);
  }

  await execute("UPDATE property_bookings SET status = ? WHERE id = ?", [status, bookingId]);

  return success({ id: bookingId, status }, "Booking status updated");
}

async function resolveAgentId(user: any): Promise<number> {
  if (user.agent_id) return Number(user.agent_id);
  const agent = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
  if (!agent) {
    throw new Error("Agent profile not found");
  }
  return Number(agent.id);
}
