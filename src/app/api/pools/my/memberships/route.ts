/**
 * GET /api/pools/my/memberships — authenticated user's pool memberships.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const rows = await fetchAll(
    `SELECT m.*, p.title as pool_title, p.slug as pool_slug, p.image as pool_image,
            p.target_amount, p.current_raised, p.status as pool_status, p.penalty_rate, p.grace_days,
            (SELECT COALESCE(SUM(c.amount), 0) FROM pool_contributions c WHERE c.membership_id = m.id AND c.status = 'paid') as total_contributed,
            (SELECT COALESCE(SUM(s.total_due), 0) FROM pool_schedules s WHERE s.membership_id = m.id AND s.status IN ('pending','overdue')) as outstanding,
            (SELECT COUNT(*) FROM pool_schedules s WHERE s.membership_id = m.id AND s.status IN ('pending','overdue')) as pending_count,
            (SELECT COUNT(*) FROM pool_schedules s WHERE s.membership_id = m.id AND s.status = 'overdue') as overdue_count,
            (SELECT MIN(s.due_date) FROM pool_schedules s WHERE s.membership_id = m.id AND s.status = 'pending') as next_due_date
     FROM pool_memberships m
     JOIN investment_pools p ON p.id = m.pool_id
     WHERE m.user_id = ?
     ORDER BY m.joined_at DESC`,
    [user.id]
  );

  const memberships = rows.map((m: Record<string, any>) => ({
    ...m,
    id: Number(m.id),
    pool_id: Number(m.pool_id),
    total_contributed: Number(m.total_contributed ?? 0),
    outstanding: Number(m.outstanding ?? 0),
    pending_count: Number(m.pending_count ?? 0),
    overdue_count: Number(m.overdue_count ?? 0),
    monthly_amount: m.monthly_amount !== null ? Number(m.monthly_amount) : null,
    target_amount: Number(m.target_amount),
    current_raised: Number(m.current_raised),
    auto_debit: Boolean(m.auto_debit),
  }));

  return success({ data: memberships }, undefined);
}
