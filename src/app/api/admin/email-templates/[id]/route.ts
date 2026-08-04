/**
 * PUT /api/admin/email-templates/{id} — update an email template.
 * DELETE /api/admin/email-templates/{id} — delete an email template.
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
  const templateId = Number(id);
  if (!templateId || templateId <= 0) {
    return error("Template ID required", 400);
  }

  const input = await readJson(req);

  const fields: string[] = [];
  const binds: unknown[] = [];

  for (const f of ["name", "subject", "body", "category"]) {
    if (f in input) {
      fields.push(`${f} = ?`);
      binds.push(input[f]);
    }
  }
  if ("is_active" in input) {
    fields.push("is_active = ?");
    binds.push(input.is_active ? 1 : 0);
  }
  if ("variables" in input) {
    fields.push("variables = ?");
    binds.push(JSON.stringify(input.variables));
  }

  if (fields.length === 0) {
    return error("No fields to update", 400);
  }

  binds.push(templateId);
  await execute(`UPDATE email_templates SET ${fields.join(", ")} WHERE id = ?`, binds);

  return success([], "Template updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const templateId = Number(id);
  if (!templateId || templateId <= 0) {
    return error("Template ID required", 400);
  }

  const template = await fetchOne("SELECT is_system FROM email_templates WHERE id = ?", [templateId]);
  if (!template) {
    return error("Template not found", 404);
  }
  if (template.is_system) {
    return error("System templates cannot be deleted", 422);
  }

  await execute("DELETE FROM email_templates WHERE id = ?", [templateId]);
  return success([], "Template deleted");
}
