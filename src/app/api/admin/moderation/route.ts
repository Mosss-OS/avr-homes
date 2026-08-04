/**
 * GET /api/admin/moderation — unified moderation queue (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const pendingVerifications = await fetchAll(
    `SELECT pv.*, p.title as property_title, a.name as agent_name
     FROM property_verifications pv
     LEFT JOIN properties p ON p.id = pv.property_id
     LEFT JOIN agents a ON a.id = pv.agent_id
     WHERE pv.status = 'pending'
     ORDER BY pv.created_at DESC LIMIT 50`
  );
  const unpublishedProperties = await fetchAll(
    "SELECT id, title, purpose, is_active, created_at FROM properties WHERE is_active = 0 ORDER BY created_at DESC LIMIT 50"
  );
  const unverifiedAgents = await fetchAll(
    "SELECT a.id, a.name, a.email, a.agency, a.created_at FROM agents a WHERE a.is_verified = 0 AND a.is_active = 1 ORDER BY a.created_at DESC LIMIT 50"
  );
  const pendingBlogPosts = await fetchAll(
    "SELECT id, title, status, created_at FROM blog_posts WHERE status = 'draft' ORDER BY created_at DESC LIMIT 50"
  );

  const format = (rows: any[]) =>
    rows.map((r: any) => {
      if (r.id !== undefined && r.id !== null) r.id = Number(r.id);
      if (r.property_id !== undefined && r.property_id !== null) r.property_id = Number(r.property_id);
      if (r.agent_id !== undefined && r.agent_id !== null) r.agent_id = Number(r.agent_id);
      return r;
    });

  return success(
    {
      pending_verifications: format(pendingVerifications),
      unpublished_properties: format(unpublishedProperties),
      unverified_agents: format(unverifiedAgents),
      pending_blog_posts: format(pendingBlogPosts),
    },
    "Moderation queue retrieved"
  );
}
