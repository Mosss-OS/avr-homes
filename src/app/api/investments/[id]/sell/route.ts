/**
 * POST /api/investments/[id]/sell — sell shares.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { query, execute } from "@/server/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const { id } = await params;
  const investmentId = Number(id);
  if (!investmentId) {
    return error("Investment ID is required", 400);
  }

  const investment = await query(
    "SELECT i.id, i.shares, i.investment_property_id, ip.title FROM investments i JOIN investment_properties ip ON ip.id = i.investment_property_id WHERE i.id = ? AND i.user_id = ? AND i.status = 'active'",
    [investmentId, user.id]
  );

  if (!investment || investment.length === 0) {
    return error("Investment not found or already sold", 404);
  }

  const inv = investment[0];

  try {
    await execute("UPDATE investments SET status = 'sold', sold_date = NOW() WHERE id = ?", [investmentId]);
    await execute(
      "UPDATE investment_properties SET available_shares = available_shares + ?, status = 'active' WHERE id = ?",
      [Number(inv.shares), Number(inv.investment_property_id)]
    );

    return success(null, "Shares listed for sale");
  } catch (e) {
    return error("Failed to sell shares", 500);
  }
}
