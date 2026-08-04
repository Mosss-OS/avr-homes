/**
 * GET /api/investments/portfolio — get user's investment portfolio.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const items = await query(
    `SELECT i.id, i.shares, i.purchase_price, i.total_amount, i.status, i.purchase_date,
            ip.title, ip.total_shares, ip.share_price, ip.expected_yield,
            ip.image, p.city, p.state
     FROM investments i
     JOIN investment_properties ip ON ip.id = i.investment_property_id
     LEFT JOIN properties p ON p.id = ip.property_id
     WHERE i.user_id = ?
     ORDER BY i.purchase_date DESC`,
    [user.id]
  );

  let totalInvested = 0;
  let totalCurrent = 0;

  const formattedItems: Record<string, any>[] = [];
  for (const item of items as any[]) {
    const formatted: Record<string, any> = {
      id: Number(item.id),
      shares: Number(item.shares),
      purchase_price: Number(item.purchase_price),
      total_amount: Number(item.total_amount),
      status: item.status,
      purchase_date: item.purchase_date,
      title: item.title,
      total_shares: Number(item.total_shares),
      share_price: Number(item.share_price),
      expected_yield: item.expected_yield ? Number(item.expected_yield) : null,
      image: item.image,
      city: item.city,
      state: item.state,
    };

    if (item.status === "active") {
      totalInvested += Number(item.total_amount);
      totalCurrent += Number(item.shares) * Number(item.share_price);
    }

    const divResult = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_dividends
       FROM investment_dividend_payments
       WHERE investment_id = ? AND status = "paid"`,
      [item.id]
    );

    formatted.dividends_earned = Number(divResult[0]?.total_dividends || 0);
    formattedItems.push(formatted);
  }

  return success({
    investments: formattedItems,
    summary: {
      total_invested: totalInvested,
      current_value: totalCurrent,
      total_dividends: formattedItems.reduce((sum, i) => sum + i.dividends_earned, 0),
      total_return: totalCurrent + formattedItems.reduce((sum, i) => sum + i.dividends_earned, 0) - totalInvested,
    },
  });
}
