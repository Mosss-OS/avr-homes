/**
 * GET /api/agents/by-slug/{slug} — get an agent by slug.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { findBySlug } from "@/server/models/agent";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const { slug } = await params;
  if (!slug) {
    return error("Agent slug is required", 400);
  }

  const agent = await findBySlug(slug);
  if (!agent) {
    return error("Agent not found", 404);
  }

  return success(agent, "Agent retrieved successfully");
}
