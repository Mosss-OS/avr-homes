/**
 * POST /api/investments/buy — buy shares (requires KYC).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { query, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("investment_property_id", "Investment property")
    .numeric("investment_property_id", "Investment property")
    .required("shares", "Shares")
    .numeric("shares", "Shares");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();
  const propertyId = Number(data.investment_property_id);
  const shares = Number(data.shares);

  // Check KYC
  const kyc = await query("SELECT status FROM kyc_records WHERE user_id = ?", [user.id]);
  if (!kyc || kyc.length === 0 || kyc[0].status !== "verified") {
    return error("KYC verification required before investing", 403);
  }

  // Check property availability
  const property = await query(
    "SELECT id, share_price, available_shares, min_investment, status FROM investment_properties WHERE id = ?",
    [propertyId]
  );

  if (!property || property.length === 0 || property[0].status !== "active") {
    return error("Investment opportunity not available", 404);
  }

  const prop = property[0];
  if (shares > Number(prop.available_shares)) {
    return error(`Only ${prop.available_shares} shares available`, 400);
  }

  const totalAmount = shares * Number(prop.share_price);
  const minInvestment = prop.min_investment ? Number(prop.min_investment) : 0;

  if (totalAmount < minInvestment) {
    return error(`Minimum investment is ${minInvestment}`, 400);
  }

  try {
    const result = await execute(
      "INSERT INTO investments (user_id, investment_property_id, shares, purchase_price, total_amount) VALUES (?, ?, ?, ?, ?)",
      [user.id, propertyId, shares, prop.share_price, totalAmount]
    );

    await execute(
      "UPDATE investment_properties SET available_shares = available_shares - ? WHERE id = ?",
      [shares, propertyId]
    );

    // Check if fully funded
    const check = await query("SELECT available_shares FROM investment_properties WHERE id = ?", [propertyId]);
    const remaining = Number(check[0]?.available_shares || 0);

    if (remaining <= 0) {
      await execute("UPDATE investment_properties SET status = 'fully_funded' WHERE id = ?", [propertyId]);
    }

    return success({
      investment_id: result.insertId,
      shares,
      total_amount: totalAmount,
    }, "Investment successful", 201);
  } catch (e) {
    return error("Investment failed: " + (e as Error).message, 500);
  }
}
