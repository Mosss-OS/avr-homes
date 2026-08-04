/**
 * GET /api/admin/stats — admin dashboard statistics (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const safeCount = async (sql: string): Promise<number> => {
    try {
      const row = await fetchOne(sql);
      return Number(row?.[Object.keys(row ?? {})[0]] ?? 0);
    } catch {
      return 0;
    }
  };

  const [totalProperties, activeProperties, totalAgents, verifiedAgents, totalUsers, pendingVerifs, totalBookings, pendingBookings, totalInquiries, unreadInquiries, totalContacts, unreadContacts, totalBlogPosts, activeSubscriptions, revenueMRR] =
    await Promise.all([
      safeCount("SELECT COUNT(*) FROM properties"),
      safeCount("SELECT COUNT(*) FROM properties WHERE is_active = 1"),
      safeCount("SELECT COUNT(*) FROM agents"),
      safeCount("SELECT COUNT(*) FROM agents WHERE is_verified = 1"),
      safeCount("SELECT COUNT(*) FROM users"),
      safeCount("SELECT COUNT(*) FROM property_verifications WHERE status = 'pending'"),
      safeCount("SELECT COUNT(*) FROM property_bookings"),
      safeCount("SELECT COUNT(*) FROM property_bookings WHERE status = 'pending'"),
      safeCount("SELECT COUNT(*) FROM inquiries"),
      safeCount("SELECT COUNT(*) FROM inquiries WHERE is_read = 0"),
      safeCount("SELECT COUNT(*) FROM contact_messages"),
      safeCount("SELECT COUNT(*) FROM contact_messages WHERE is_read = 0"),
      safeCount("SELECT COUNT(*) FROM blog_posts"),
      safeCount("SELECT COUNT(DISTINCT s.agent_id) FROM agent_subscriptions s WHERE s.status = 'active'"),
      safeCount(
        "SELECT COALESCE(SUM(CASE s.tier WHEN 'bronze' THEN 5000 WHEN 'silver' THEN 15000 WHEN 'gold' THEN 50000 WHEN 'platinum' THEN 150000 ELSE 0 END), 0) FROM agent_subscriptions s WHERE s.status = 'active'"
      ),
    ]);

  return success(
    {
      properties: { total: totalProperties, active: activeProperties },
      agents: { total: totalAgents, verified: verifiedAgents },
      users: { total: totalUsers },
      verifications: { pending: pendingVerifs },
      bookings: { total: totalBookings, pending: pendingBookings },
      inquiries: { total: totalInquiries, unread: unreadInquiries },
      contact_messages: { total: totalContacts, unread: unreadContacts },
      blog_posts: { total: totalBlogPosts },
      subscriptions: { active: activeSubscriptions, mrr: revenueMRR },
    },
    "Dashboard stats retrieved"
  );
}
