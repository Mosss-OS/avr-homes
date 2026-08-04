/**
 * PUT /api/admin/agents/{id}/status — update agent active/inactive status (admin only).
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
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid agent ID", 400);

  const input = await readJson(req);
  const isActive = input.is_active ? 1 : 0;

  const agent = await fetchOne("SELECT user_id FROM agents WHERE id = ?", [idNum]);
  if (!agent) return error("Agent not found", 404);

  await execute("UPDATE agents SET is_active = ? WHERE id = ?", [isActive, idNum]);
  await execute("UPDATE users SET is_active = ? WHERE id = ?", [isActive, agent.user_id]);

  return success({ id: idNum, is_active: Boolean(isActive) }, "Agent status updated");
}
