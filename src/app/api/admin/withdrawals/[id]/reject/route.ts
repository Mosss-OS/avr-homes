/**
 * PUT /api/admin/withdrawals/{id}/reject — reject a pending withdrawal and refund the wallet (admin).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, beginTransaction, txExecute, commit, rollback } from "@/server/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const txId = Number(id);
  if (!txId || txId <= 0) {
    return error("Invalid transaction ID", 400);
  }

  const tx = await fetchOne("SELECT * FROM wallet_transactions WHERE id = ? AND type = 'debit' AND status = 'pending'", [txId]);
  if (!tx) {
    return error("Pending withdrawal not found", 404);
  }

  const conn = await beginTransaction();
  try {
    await txExecute(conn, "UPDATE wallet_transactions SET status = 'failed' WHERE id = ?", [txId]);
    await txExecute(
      conn,
      "UPDATE agent_wallets SET balance = balance + ?, total_withdrawn = total_withdrawn - ? WHERE id = ?",
      [Number(tx.amount), Number(tx.amount), Number(tx.wallet_id)]
    );
    await commit(conn);
    return success({ id: txId }, "Withdrawal rejected and wallet refunded");
  } catch (e: any) {
    await rollback(conn);
    return error("Failed to reject withdrawal: " + (e?.message ?? "Unknown error"), 500);
  }
}
