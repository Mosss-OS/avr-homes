/**
 * POST /api/admin/migrations/run — run all pending migrations.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import {
  fetchOne,
  fetchAll,
  execute,
  beginTransaction,
  commit,
  rollback,
  rawQuery,
} from "@/server/db";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const MIGRATIONS_DIR = path.join(process.cwd(), "backend", "database", "migrations");

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  if (!existsSync(MIGRATIONS_DIR)) {
    return error("No migration files found", 404);
  }
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  if (files.length === 0) {
    return error("No migration files found", 404);
  }

  try {
    await rawQuery(
      `CREATE TABLE IF NOT EXISTS migrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        migration VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );
  } catch (e: any) {
    return error("Failed to ensure migrations table: " + (e?.message ?? "Unknown error"), 500);
  }

  const results: Record<string, any>[] = [];

  for (const name of files) {
    const executed = await fetchOne("SELECT id FROM migrations WHERE migration = ?", [name]);
    if (executed) {
      continue;
    }

    const sql = readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    const conn = await beginTransaction();
    try {
      for (const statement of statements) {
        await conn.query(statement);
      }
      await commit(conn);
    } catch (e: any) {
      await rollback(conn);
      results.push({ migration: name, status: "failed", error: e?.message ?? "Unknown error" });
      continue;
    }

    try {
      await execute("INSERT INTO migrations (migration) VALUES (?)", [name]);
    } catch (e: any) {
      // Migration ran but the record failed — surface as failed to avoid re-runs.
      results.push({ migration: name, status: "failed", error: e?.message ?? "Unknown error" });
      continue;
    }

    results.push({ migration: name, status: "executed" });
  }

  const pending = await getPending();
  return success({ results, pending }, "Migrations executed");
}

async function getPending(): Promise<string[]> {
  const all = existsSync(MIGRATIONS_DIR)
    ? readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()
    : [];
  const executedRows = await fetchAll("SELECT migration FROM migrations ORDER BY migration");
  const executed = new Set((executedRows ?? []).map((r: any) => r.migration));
  return all.filter((f) => !executed.has(f));
}
