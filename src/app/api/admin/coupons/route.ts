/**
 * GET /api/admin/coupons — list all coupons.
 * POST /api/admin/coupons — create a coupon.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, fetchAll, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const q = (sp.get("q") ?? "").trim();
  const active = sp.get("active") ?? "";

  let where = "";
  const binds: unknown[] = [];

  if (q) {
    where += " AND (code LIKE ? OR description LIKE ?)";
    const like = `%${q}%`;
    binds.push(like, like);
  }
  if (active === "1") {
    where += " AND is_active = 1";
  } else if (active === "0") {
    where += " AND is_active = 0";
  }

  const countRow = await fetchOne(`SELECT COUNT(*) AS c FROM coupons WHERE 1=1 ${where}`, binds);
  const total = Number(countRow?.c ?? 0);

  const offset = (page - 1) * perPage;
  const rows = await fetchAll(`SELECT * FROM coupons WHERE 1=1 ${where} ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}`, binds);

  const coupons = rows.map((c: Record<string, any>) => ({
    ...c,
    id: Number(c.id),
    discount_value: Number(c.discount_value),
    min_order_amount: c.min_order_amount ? Number(c.min_order_amount) : null,
    max_discount: c.max_discount ? Number(c.max_discount) : null,
    max_uses: c.max_uses ? Number(c.max_uses) : null,
    max_uses_per_user: c.max_uses_per_user ? Number(c.max_uses_per_user) : null,
    used_count: Number(c.used_count),
    is_active: Boolean(c.is_active),
  }));

  return success(
    { data: coupons, total, page, total_pages: Math.ceil(total / perPage) },
    "Coupons retrieved"
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("code", "Coupon code")
    .required("discount_type", "Discount type")
    .required("discount_value", "Discount value");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();
  const code = String(data.code).toUpperCase().trim();

  const existing = await fetchOne("SELECT 1 FROM coupons WHERE code = ?", [code]);
  if (existing) {
    return error("Coupon code already exists", 409);
  }

  const result = await execute(
    `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, max_uses, max_uses_per_user, applies_to, is_active, starts_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code,
      data.description ?? null,
      data.discount_type,
      Number(data.discount_value),
      data.min_order_amount !== undefined ? Number(data.min_order_amount) : null,
      data.max_discount !== undefined ? Number(data.max_discount) : null,
      data.max_uses !== undefined ? Number(data.max_uses) : null,
      data.max_uses_per_user !== undefined ? Number(data.max_uses_per_user) : null,
      data.applies_to ?? "all",
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      data.starts_at ?? null,
      data.expires_at ?? null,
    ]
  );

  return success({ id: Number(result.insertId) }, "Coupon created", 201);
}
