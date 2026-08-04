/**
 * GET /api/agents — list all agents.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { findAll } from "@/server/models/agent";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const agents = await findAll();
  return success(agents, "Agents retrieved successfully");
}
