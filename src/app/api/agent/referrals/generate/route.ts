/**
 * POST /api/agent/referrals/generate — generate a unique referral code for the authenticated agent.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const userId = user.id;

  const existing = await fetchOne("SELECT referral_code FROM referrals WHERE referrer_id = ? LIMIT 1", [userId]);

  if (existing) {
    return success({ referral_code: existing.referral_code }, "Referral code already exists");
  }

  const code = await generateUniqueCode();

  const result = await execute(
    "INSERT INTO referrals (referrer_id, referral_code, status) VALUES (?, ?, 'pending')",
    [userId, code]
  );

  if (result.insertId) {
    return success({ referral_code: code }, "Referral code generated", 201);
  }

  return error("Failed to generate referral code", 500);
}

async function generateUniqueCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const existing = await fetchOne("SELECT 1 FROM referrals WHERE referral_code = ?", [code]);
    if (!existing) {
      return code;
    }
  }

  return "REF" + Math.random().toString(36).substring(2, 8).toUpperCase();
}
