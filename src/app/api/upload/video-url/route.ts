/**
 * POST /api/upload/video-url — add a video URL to a property's video gallery (authenticated).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;

  const input = await readJson(req);
  const propertyId = Number(input.property_id ?? 0);
  const url = String(input.url ?? "").trim();

  if (!propertyId || propertyId <= 0) return error("Property ID is required", 400);
  if (!url) return error("Video URL is required", 400);

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return error("Invalid URL", 400);
  } catch {
    return error("Invalid URL", 400);
  }

  const maxSort = await fetchOne("SELECT COALESCE(MAX(sort_order),0) AS s FROM property_videos WHERE property_id = ?", [propertyId]);
  const sort = Number(maxSort?.s ?? 0);

  const inserted = await execute(
    `INSERT INTO property_videos (property_id, file_path, file_name, file_size, mime_type, sort_order)
     VALUES (?, ?, ?, 0, 'video/url', ?)`,
    [propertyId, url, basename(url), sort]
  );
  const videoId = Number(inserted.insertId);

  return success({ id: videoId, url, file_name: basename(url) }, "Video URL added");
}

function basename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split("/").filter(Boolean).pop();
    return base ? decodeURIComponent(base) : url;
  } catch {
    return url;
  }
}
