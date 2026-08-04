/**
 * POST /api/admin/investments/dividends — admin declare dividend.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { query, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

/**
 * POST /api/admin/investments/dividends — admin declare dividend.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_investments_write");
  if (auth instanceof NextResponse) return auth;

  const input = await readJson(req);
  if (!input) {
    return error("No data provided", 400);
  }

  const validator = new Validator(input);
  validator
    .required("investment_property_id", "Investment Property")
    .numeric("investment_property_id", "Investment Property")
    .required("amount_per_share", "Amount Per Share")
    .numeric("amount_per_share", "Amount Per Share");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();
  const propertyId = Number(data.investment_property_id);
  const amountPerShare = Number(data.amount_per_share);

  // Get total active shares for this property
  const shareResult = await query(
    "SELECT COALESCE(SUM(shares), 0) AS total_active_shares FROM investments WHERE investment_property_id = ? AND status = 'active'",
    [propertyId]
  );
  const totalShares = Number(shareResult[0]?.total_active_shares || 0);

  if (totalShares <= 0) {
    return error("No active investments for this property", 400);
  }

  const totalAmount = totalShares * amountPerShare;

  try {
    const dividendResult = await execute(
      "INSERT INTO dividends (investment_property_id, amount_per_share, total_amount, declared_at, period_start, period_end) VALUES (?, ?, ?, NOW(), ?, ?)",
      [propertyId, amountPerShare, totalAmount, data.period_start ?? null, data.period_end ?? null]
    );

    const dividendId = dividendResult.insertId;

    // Create payment records for each active investor
    const investments = await query(
      "SELECT id, user_id, shares FROM investments WHERE investment_property_id = ? AND status = 'active'",
      [propertyId]
    );

    for (const inv of investments as any[]) {
      await execute(
        "INSERT INTO investment_dividend_payments (dividend_id, investment_id, user_id, shares_held, amount) VALUES (?, ?, ?, ?, ?)",
        [dividendId, Number(inv.id), Number(inv.user_id), Number(inv.shares), Number(inv.shares) * amountPerShare]
      );
    }

    return success({
      dividend_id: dividendId,
      total_amount: totalAmount,
      investors: (investments as any[]).length,
    }, "Dividend declared", 201);
  } catch (e) {
    return error("Failed to declare dividend: " + (e as Error).message, 500);
  }
}