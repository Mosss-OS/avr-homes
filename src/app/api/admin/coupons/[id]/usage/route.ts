/**
 * GET /api/admin/coupons/{id}/usage — get coupon usage stats.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const couponId = Number(id);
  if (!couponId || couponId <= 0) {
    return error("Coupon ID required", 400);
  }

  const rows = await fetchAll(
    `SELECT cu.*, u.name as user_name, u.email as user_email
     FROM coupon_usage cu
     LEFT JOIN users u ON u.id = cu.user_id
     WHERE cu.coupon_id = ?
     ORDER BY cu.used_at DESC
     LIMIT 100`,
    [couponId]
  );

  const usage = rows.map((u: Record<string, any>) => ({
    ...u,
    id: Number(u.id),
    coupon_id: Number(u.coupon_id),
    user_id: Number(u.user_id),
    order_id: u.order_id ? Number(u.order_id) : null,
    discount_amount: Number(u.discount_amount),
  }));

  return success(usage, "Coupon usage retrieved");
}
