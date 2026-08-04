/**
 * POST /api/admin/backup — create a new database backup.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { createBackup } from "@/server/backup";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const result = await createBackup();
  if (!result.success) {
    return error(result.error ?? "Backup failed", 500);
  }

  return success(
    { file: result.file, size: result.size },
    "Backup created successfully",
    201
  );
}
