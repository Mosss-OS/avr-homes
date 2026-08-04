/**
 * GET /api/agent/messages/unread-count — get unread message count for the authenticated agent.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { fetchOne } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const row = await fetchOne(
    `SELECT COUNT(*) as cnt FROM inquiry_messages m
     JOIN inquiries i ON m.inquiry_id = i.id
     JOIN properties p ON i.property_id = p.id
     WHERE p.agent_id = (SELECT id FROM agents WHERE user_id = ?)
     AND m.sender_type = 'user'
     AND m.is_read = 0`,
    [user.id]
  );

  return success({ unread_count: Number(row?.cnt ?? 0) }, "Unread count retrieved");
}
