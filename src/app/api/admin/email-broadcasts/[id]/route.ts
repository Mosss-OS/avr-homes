/**
 * PUT /api/admin/email-broadcasts/{id} — update an email broadcast.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const broadcastId = Number(id);
  if (!broadcastId || broadcastId <= 0) {
    return error("Broadcast ID required", 400);
  }

  const input = await readJson(req);

  const existing = await fetchOne("SELECT status FROM email_broadcasts WHERE id = ?", [broadcastId]);
  if (!existing) {
    return error("Broadcast not found", 404);
  }
  if (existing.status === "sent") {
    return error("Cannot modify a sent broadcast", 422);
  }

  const fields: string[] = [];
  const binds: unknown[] = [];

  for (const f of ["subject", "body", "recipient_filter", "scheduled_at"]) {
    if (f in input) {
      fields.push(`${f} = ?`);
      binds.push(input[f]);
    }
  }
  if ("status" in input) {
    fields.push("status = ?");
    binds.push(input.status);
  }

  if (fields.length === 0) {
    return error("No fields to update", 400);
  }

  binds.push(broadcastId);
  await execute(`UPDATE email_broadcasts SET ${fields.join(", ")} WHERE id = ?`, binds);

  if ((input.status ?? "") === "sent") {
    await execute("UPDATE email_broadcasts SET sent_at = NOW(), status = 'sent' WHERE id = ?", [broadcastId]);
  }

  return success([], "Broadcast updated");
}
