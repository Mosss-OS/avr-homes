/**
 * POST /api/auth/logout — revoke the refresh token and log the activity.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticate, isUser } from "@/server/auth";
import { error, success } from "@/server/response";
import { execute } from "@/server/db";
import { readJson } from "@/server/http";
import { getClientIp } from "@/server/rate-limiter";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authResult = await authenticate(req);
  if (!isUser(authResult)) return authResult as NextResponse;
  const user = authResult;

  const input = await readJson(req);
  if (input.refresh_token) {
    await execute("UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ? AND user_id = ?", [
      input.refresh_token,
      user.id,
    ]);
  }

  await execute("INSERT INTO activity_logs (user_id, action, entity_type, ip_address) VALUES (?, ?, ?, ?)", [
    user.id,
    "logout",
    user.role,
    getClientIp(req),
  ]);

  return success(null, "Logged out successfully");
}
