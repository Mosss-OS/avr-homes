/**
 * PUT /api/admin/inquiries/{id}/assign — assign an inquiry to an agent (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid inquiry ID", 400);

  const input = await readJson(req);
  const assignedTo = input.assigned_to !== null && input.assigned_to !== undefined && input.assigned_to !== ""
    ? Number(input.assigned_to)
    : null;

  await execute("UPDATE inquiries SET assigned_to = ? WHERE id = ?", [assignedTo, idNum]);

  return success({ id: idNum }, "Inquiry assigned");
}
