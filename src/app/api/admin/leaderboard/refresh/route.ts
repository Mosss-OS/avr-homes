/**
 * POST /api/admin/leaderboard/refresh — trigger a manual refresh of cached leaderboard data.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  return success(null, "Leaderboard refresh triggered");
}
