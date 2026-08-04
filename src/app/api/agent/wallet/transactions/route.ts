/**
 * GET /api/agent/wallet/transactions — list wallet transactions for the authenticated agent.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { fetchOne, fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;
  const userId = user.id;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(sp.get("per_page") ?? 20)));

  const wallet = await fetchOne("SELECT id FROM agent_wallets WHERE agent_id = ?", [userId]);
  if (!wallet) {
    return success({ data: [], total: 0, page: 1, per_page: perPage, total_pages: 0 }, "Wallet transactions retrieved");
  }

  const walletId = Number(wallet.id);

  const countRow = await fetchOne("SELECT COUNT(*) AS c FROM wallet_transactions WHERE wallet_id = ?", [walletId]);
  const total = Number(countRow?.c ?? 0);

  const offset = (page - 1) * perPage;
  const transactions = await fetchAll(
    "SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [walletId, perPage, offset]
  );

  const data = transactions.map((tx: Record<string, any>) => ({
    ...tx,
    id: Number(tx.id),
    wallet_id: Number(tx.wallet_id),
    amount: Number(tx.amount),
  }));

  return success(
    {
      data,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Wallet transactions retrieved"
  );
}
