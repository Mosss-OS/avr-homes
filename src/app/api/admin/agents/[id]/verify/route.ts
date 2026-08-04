/**
 * PUT /api/admin/agents/{id}/verify — toggle agent verified status (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid agent ID", 400);

  const current = await fetchOne("SELECT is_verified FROM agents WHERE id = ?", [idNum]);
  if (!current) return error("Agent not found", 404);

  const newValue = Number(current.is_verified) ? 0 : 1;
  await execute("UPDATE agents SET is_verified = ? WHERE id = ?", [newValue, idNum]);

  return success({ id: idNum, is_verified: Boolean(newValue) }, "Agent verification toggled");
}
