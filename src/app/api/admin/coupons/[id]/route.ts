/**
 * PUT /api/admin/coupons/{id} — update a coupon.
 * DELETE /api/admin/coupons/{id} — delete a coupon.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const couponId = Number(id);
  if (!couponId || couponId <= 0) {
    return error("Coupon ID required", 400);
  }

  const input = await readJson(req);

  const fields: string[] = [];
  const binds: unknown[] = [];

  for (const f of ["code", "description", "discount_type", "discount_value", "min_order_amount", "max_discount", "max_uses", "max_uses_per_user", "applies_to", "starts_at", "expires_at"]) {
    if (f in input) {
      fields.push(`${f} = ?`);
      binds.push(input[f]);
    }
  }
  if ("is_active" in input) {
    fields.push("is_active = ?");
    binds.push(input.is_active ? 1 : 0);
  }

  if (fields.length === 0) {
    return error("No fields to update", 400);
  }

  binds.push(couponId);
  await execute(`UPDATE coupons SET ${fields.join(", ")} WHERE id = ?`, binds);

  return success([], "Coupon updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const couponId = Number(id);
  if (!couponId || couponId <= 0) {
    return error("Coupon ID required", 400);
  }

  await execute("DELETE FROM coupons WHERE id = ?", [couponId]);
  return success([], "Coupon deleted");
}
