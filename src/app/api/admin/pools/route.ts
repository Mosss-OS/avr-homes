/**
 * GET /api/admin/pools — admin list of all pools.
 * POST /api/admin/pools — create a new pool.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { query, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const pools = await query("SELECT * FROM investment_pools ORDER BY created_at DESC");
  const data = (pools as any[]).map((pool) => hydratePool(pool));
  return success({ data });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("title", "Title")
    .required("target_amount", "Target Amount")
    .numeric("target_amount", "Target Amount");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();
  const slug = generateSlug(data.title as string);

  const result = await execute(
    `INSERT INTO investment_pools (title, slug, description, image, target_property_id, target_amount,
      default_monthly, min_monthly, max_monthly, min_lump_sum, allow_monthly, allow_lump_sum,
      penalty_rate, grace_days, default_after_days, reminder_days_before, start_date, end_date, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.title,
      slug,
      (input.description as string) ?? null,
      (input.image as string) ?? null,
      input.target_property_id && String(input.target_property_id) !== "" ? Number(input.target_property_id) : null,
      Number(data.target_amount),
      input.default_monthly !== "" && input.default_monthly !== undefined ? Number(input.default_monthly) : null,
      input.min_monthly !== "" && input.min_monthly !== undefined ? Number(input.min_monthly) : null,
      input.max_monthly !== "" && input.max_monthly !== undefined ? Number(input.max_monthly) : null,
      input.min_lump_sum !== "" && input.min_lump_sum !== undefined ? Number(input.min_lump_sum) : null,
      input.allow_monthly ? 1 : 0,
      input.allow_lump_sum ? 1 : 0,
      Number(input.penalty_rate ?? 5.0),
      Number(input.grace_days ?? 7),
      Number(input.default_after_days ?? 30),
      (input.reminder_days_before as string) ?? "7,3,1",
      (input.start_date as string) || null,
      (input.end_date as string) || null,
      (input.status as string) ?? "draft",
    ]
  );

  return success({ id: Number(result.insertId) }, "Pool created successfully", 201);
}

export function hydratePool(pool: Record<string, any>): Record<string, any> {
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

export function generateSlug(title: string): string {
  let slug = title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s-]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug === "") {
    slug = "pool-" + Math.floor(Date.now() / 1000);
  }
  return slug;
}
