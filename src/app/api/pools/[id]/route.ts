/**
 * GET /api/pools/{id} — public pool detail (by id or slug).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { query } from "@/server/db";
import { tryAuthenticate } from "@/server/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const key = id;
  const isNumeric = /^[0-9]+$/.test(key);

  const base = `
    SELECT p.*, pr.title as property_title, pr.city as property_city, pr.image as property_image, pr.address as property_address
    FROM investment_pools p
    LEFT JOIN properties pr ON pr.id = p.target_property_id
  `;

  const pools = isNumeric
    ? await query(`${base} WHERE p.id = ?`, [Number(key)])
    : await query(`${base} WHERE p.slug = ?`, [key]);

  if (!pools || pools.length === 0) {
    return error("Pool not found", 404);
  }

  const pool = hydratePool(pools[0]);

  pool.is_member = false;
  const user = await tryAuthenticate(req);
  if (user && "id" in user) {
    const memberships = await query(
      "SELECT id FROM pool_memberships WHERE pool_id = ? AND user_id = ? AND status IN ('active','paused','defaulted')",
      [pool.id, user.id]
    );
    if (memberships && memberships.length > 0) {
      pool.is_member = true;
    }
  }

  return success(pool, "Pool retrieved successfully");
}

function hydratePool(pool: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...pool };
  out.id = Number(out.id);
  out.target_property_id = out.target_property_id !== null ? Number(out.target_property_id) : null;
  out.target_amount = Number(out.target_amount);
  out.current_raised = Number(out.current_raised);
  out.member_count = Number(out.member_count);
  out.allow_monthly = Boolean(out.allow_monthly);
  out.allow_lump_sum = Boolean(out.allow_lump_sum);
  out.penalty_rate = Number(out.penalty_rate);
  out.grace_days = Number(out.grace_days);
  out.default_after_days = Number(out.default_after_days);
  out.default_monthly = out.default_monthly !== null ? Number(out.default_monthly) : null;
  out.min_monthly = out.min_monthly !== null ? Number(out.min_monthly) : null;
  out.max_monthly = out.max_monthly !== null ? Number(out.max_monthly) : null;
  out.min_lump_sum = out.min_lump_sum !== null ? Number(out.min_lump_sum) : null;
  out.funding_percentage = out.target_amount > 0
    ? Math.floor((out.current_raised / out.target_amount) * 100)
    : 0;
  out.reminder_days = String(out.reminder_days_before ?? "7,3,1").split(",").map(Number);
  return out;
}
