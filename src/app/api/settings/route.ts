/**
 * GET /api/settings — public settings lookup.
 * POST /api/settings — update settings (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { readJson } from "@/server/http";
import { execute, query } from "@/server/db";
import { getClientIp } from "@/server/rate-limiter";

export const runtime = "nodejs";

async function getSettings(): Promise<Record<string, string>> {
  const rows = await query("SELECT `key`, `value` FROM settings");
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const settings = await getSettings();
  return success(settings, "Settings retrieved successfully");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const input = await readJson(req);
  if (!input || Object.keys(input).length === 0) {
    return error("No settings provided", 400);
  }

  for (const [key, value] of Object.entries(input)) {
    await execute("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", [
      key,
      String(value),
    ]);
  }

  await execute("INSERT INTO activity_logs (user_id, action, entity_type, ip_address) VALUES (?, ?, ?, ?)", [
    user.id,
    "update_settings",
    "settings",
    getClientIp(req),
  ]);

  const settings = await getSettings();
  return success(settings, "Settings updated successfully");
}
