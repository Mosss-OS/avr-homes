/**
 * GET /api/pools — public list of pools with funding progress.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const status = req.nextUrl.searchParams.get("status") ?? "active";
  let where = "";
  const bindings: unknown[] = [];

  if (status === "active") {
    where = "WHERE p.status IN ('active','funded')";
  } else if (status === "all") {
    where = "";
  } else {
    where = "WHERE p.status = ?";
    bindings.push(status);
  }

  const sql = `
    SELECT p.*, pr.title as property_title, pr.city as property_city, pr.image as property_image
    FROM investment_pools p
    LEFT JOIN properties pr ON pr.id = p.target_property_id
    ${where}
    ORDER BY p.status = 'active' DESC, p.created_at DESC
  `;

  const pools = await query(sql, bindings);

  const data = (pools as any[]).map((pool) => hydratePool(pool));

  return success({ data });
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
