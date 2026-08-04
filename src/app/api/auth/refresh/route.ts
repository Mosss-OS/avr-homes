/**
 * POST /api/auth/refresh — exchange a valid refresh token for a new token pair.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateToken, generateRefreshToken } from "@/server/auth";
import { error, success } from "@/server/response";
import { execute, fetchOne } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = await readJson(req);
  if (!input.refresh_token) {
    return error("Refresh token is required", 400);
  }

  const result = await fetchOne(
    `SELECT rt.user_id, rt.token, u.id, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token = ? AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
    [input.refresh_token]
  );

  if (!result) {
    return error("Invalid or expired refresh token", 401);
  }

  if (!result.is_active) {
    return error("Account is inactive", 401);
  }

  await execute("UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ?", [input.refresh_token]);

  const userId = Number(result.user_id);
  const newToken = generateToken(userId);
  const newRefreshToken = await generateRefreshToken(userId);

  return success({
    token: newToken,
    refresh_token: newRefreshToken,
  }, "Token refreshed");
}
