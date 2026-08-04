/**
 * DELETE /api/inquiries/{id} — delete an inquiry (admin).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { execute } from "@/server/db";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const inquiryId = Number(id);
  if (!inquiryId || inquiryId <= 0) {
    return error("Invalid inquiry ID", 400);
  }

  const result = await execute("DELETE FROM inquiries WHERE id = ?", [inquiryId]);
  if (result.affectedRows === 0) {
    return error("Inquiry not found", 404);
  }

  return success(null, "Inquiry deleted successfully");
}
