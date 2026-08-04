/**
 * PUT /api/admin/withdrawals/{id}/approve — approve a pending withdrawal (admin).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";

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

  await execute("UPDATE wallet_transactions SET status = 'completed' WHERE id = ?", [txId]);
  return success({ id: txId }, "Withdrawal approved");
}
