/**
 * PUT /api/admin/investments/dividends/{id}/pay — admin mark dividend as paid.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { execute } from "@/server/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_investments_write");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const dividendId = Number(id);
  if (!dividendId || dividendId <= 0) {
    return error("Dividend ID is required", 400);
  }

  try {
    await execute("UPDATE dividends SET status = 'paid', paid_at = NOW() WHERE id = ?", [dividendId]);
    await execute("UPDATE investment_dividend_payments SET status = 'paid', paid_at = NOW() WHERE dividend_id = ?", [dividendId]);
    return success(null, "Dividend marked as paid");
  } catch (e) {
    return error("Failed to mark dividend as paid", 500);
  }
}
