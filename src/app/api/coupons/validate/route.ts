/**
 * POST /api/coupons/validate — validate and apply a coupon.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { fetchOne } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = await readJson(req);
  const code = String(input.code ?? "").trim().toUpperCase();
  const orderAmount = Number(input.order_amount ?? 0);
  const appliesTo = String(input.applies_to ?? "all");
  const userId = input.user_id ? Number(input.user_id) : null;

  if (!code) {
    return error("Coupon code required", 400);
  }

  const coupon = await fetchOne("SELECT * FROM coupons WHERE code = ? LIMIT 1", [code]);
  if (!coupon) {
    return error("Invalid coupon code", 404);
  }
  if (!coupon.is_active) {
    return error("This coupon has been deactivated", 422);
  }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return error("This coupon has expired", 422);
  }
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > Date.now()) {
    return error("This coupon is not yet active", 422);
  }
  if (coupon.max_uses && Number(coupon.used_count) >= Number(coupon.max_uses)) {
    return error("This coupon has reached its usage limit", 422);
  }

  if (appliesTo !== "all" && coupon.applies_to !== "all" && coupon.applies_to !== appliesTo) {
    return error("This coupon does not apply to this order type", 422);
  }

  if (orderAmount > 0 && coupon.min_order_amount && orderAmount < Number(coupon.min_order_amount)) {
    return error(`Minimum order amount of ${Number(coupon.min_order_amount).toFixed(2)} required`, 422);
  }

  if (userId && coupon.max_uses_per_user) {
    const usage = await fetchOne("SELECT COUNT(*) AS c FROM coupon_usage WHERE coupon_id = ? AND user_id = ?", [coupon.id, userId]);
    if (Number(usage?.c ?? 0) >= Number(coupon.max_uses_per_user)) {
      return error("You have reached the usage limit for this coupon", 422);
    }
  }

  let discount = 0;
  if (coupon.discount_type === "percentage") {
    discount = orderAmount * (Number(coupon.discount_value) / 100);
    if (coupon.max_discount && discount > Number(coupon.max_discount)) {
      discount = Number(coupon.max_discount);
    }
  } else {
    discount = Math.min(Number(coupon.discount_value), orderAmount);
  }

  return success(
    {
      coupon_id: Number(coupon.id),
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      discount_amount: Math.round(discount * 100) / 100,
      description: coupon.description,
    },
    "Coupon is valid"
  );
}
