/**
 * GET /api/admin/backup/download/{name} — download a backup file.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { getBackupPath } from "@/server/backup";
import { readFileSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { name } = await params;
  if (!name) {
    return error("Backup name required", 400);
  }

  const filePath = getBackupPath(name);
  if (!filePath) {
    return error("Backup not found", 404);
  }

  const content = readFileSync(filePath);

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "application/sql",
      "Content-Disposition": `attachment; filename="${path.basename(filePath)}"`,
      "Content-Length": String(content.byteLength),
    },
  });
}
