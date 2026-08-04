/**
 * GET /api/agent/wallet — retrieve the authenticated agent's wallet (creates one if none exists).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;
  const userId = user.id;

  let wallet = await fetchOne(
    "SELECT id, balance, total_earned, total_withdrawn, created_at, updated_at FROM agent_wallets WHERE agent_id = ?",
    [userId]
  );

  if (!wallet) {
    const result = await execute(
      "INSERT INTO agent_wallets (agent_id, balance, total_earned, total_withdrawn) VALUES (?, 0, 0, 0)",
      [userId]
    );
    wallet = {
      id: Number(result.insertId),
      agent_id: userId,
      balance: "0.00",
      total_earned: "0.00",
      total_withdrawn: "0.00",
      created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
      updated_at: new Date().toISOString().slice(0, 19).replace("T", " "),
    };
  }

  return success(
    {
      ...wallet,
      id: Number(wallet.id),
      balance: Number(wallet.balance),
      total_earned: Number(wallet.total_earned),
      total_withdrawn: Number(wallet.total_withdrawn),
    },
    "Wallet retrieved"
  );
}
