/**
 * GET /api/pools/my/memberships/{membership_id} — authenticated user's
 * detailed pool membership with schedules and contributions.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { fetchOne, fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ membership_id: string }> }): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const { membership_id } = await params;
  const membershipId = Number(membership_id);

  const membership = await fetchOne(
    `SELECT m.*, p.title as pool_title, p.slug as pool_slug, p.image as pool_image,
            p.target_amount, p.current_raised, p.penalty_rate, p.grace_days, p.default_after_days, p.status as pool_status,
            (SELECT COALESCE(SUM(c.amount), 0) FROM pool_contributions c WHERE c.membership_id = m.id AND c.status = 'paid') as total_contributed,
            (SELECT COALESCE(SUM(c.penalty_amount), 0) FROM pool_contributions c WHERE c.membership_id = m.id AND c.status = 'paid') as total_penalties
     FROM pool_memberships m
     JOIN investment_pools p ON p.id = m.pool_id
     WHERE m.id = ? AND m.user_id = ?`,
    [membershipId, user.id]
  );
  if (!membership) {
    return error("Membership not found", 404);
  }

  const m = {
    ...membership,
    id: Number(membership.id),
    pool_id: Number(membership.pool_id),
    total_contributed: Number(membership.total_contributed ?? 0),
    total_penalties: Number(membership.total_penalties ?? 0),
    monthly_amount: membership.monthly_amount !== null ? Number(membership.monthly_amount) : null,
    target_amount: Number(membership.target_amount),
    current_raised: Number(membership.current_raised),
    auto_debit: Boolean(membership.auto_debit),
  };

  const scheduleRows = await fetchAll(
    `SELECT id, due_date, amount, penalty_amount, total_due, status, paid_at, payment_ref
     FROM pool_schedules WHERE membership_id = ? ORDER BY due_date DESC`,
    [membershipId]
  );
  const schedules = scheduleRows.map((s: Record<string, any>) => ({
    ...s,
    id: Number(s.id),
    amount: Number(s.amount),
    penalty_amount: Number(s.penalty_amount),
    total_due: Number(s.total_due),
  }));

  const contribRows = await fetchAll(
    `SELECT id, amount, penalty_amount, type, channel, payment_ref, status, paid_at, created_at
     FROM pool_contributions WHERE membership_id = ? ORDER BY created_at DESC LIMIT 100`,
    [membershipId]
  );
  const contributions = contribRows.map((c: Record<string, any>) => ({
    ...c,
    id: Number(c.id),
    amount: Number(c.amount),
    penalty_amount: Number(c.penalty_amount),
  }));

  return success({ membership: m, schedules, contributions }, undefined);
}
