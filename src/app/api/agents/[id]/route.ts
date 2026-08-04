/**
 * GET /api/agents/{id} — get an agent by ID.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { findById } from "@/server/models/agent";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const idNum = Number(id);
  if (!idNum || idNum <= 0) {
    return error("Invalid agent ID", 400);
  }

  const agent = await findById(idNum);
  if (!agent) {
    return error("Agent not found", 404);
  }

  return success(agent, "Agent retrieved successfully");
}
