/**
 * PUT /api/admin/investments/[id]/status — admin update investment property status.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_investments_write");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const investmentId = Number(id);
  if (!investmentId) {
    return error("Investment property ID is required", 400);
  }

  const input = await readJson(req);
  const status = input.status ?? null;

  if (!["active", "fully_funded", "closed"].includes(status)) {
    return error("Invalid status. Use: active, fully_funded, closed", 422);
  }

  await execute("UPDATE investment_properties SET status = ? WHERE id = ?", [status, investmentId]);

  return success({ id: investmentId, status }, "Investment property status updated");
}