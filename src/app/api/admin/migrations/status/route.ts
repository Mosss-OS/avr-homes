/**
 * GET /api/admin/migrations/status — show executed and pending migrations.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchAll } from "@/server/db";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const MIGRATIONS_DIR = path.join(process.cwd(), "backend", "database", "migrations");

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const all = existsSync(MIGRATIONS_DIR)
    ? readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()
    : [];

  let executedRows: any[] = [];
  try {
    executedRows = await fetchAll("SELECT migration FROM migrations ORDER BY migration");
  } catch (e: any) {
    executedRows = [];
  }
  const executed = (executedRows ?? []).map((r: any) => r.migration);
  const pending = all.filter((f) => !executed.includes(f));

  return success(
    {
      executed,
      pending,
      total: all.length,
      done: executed.length,
    },
    undefined
  );
}
