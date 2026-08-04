/**
 * POST /api/upload/from-url — download a file from a remote URL and upload to Cloudinary (authenticated).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { readJson } from "@/server/http";
import { upload } from "@/server/cloudinary";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;

  const input = await readJson(req);
  const url = String(input.url ?? "").trim();
  const folder = String(input.folder ?? "avr-homes/media").trim();

  if (!url) {
    return error("URL is required", 400);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(300000),
      headers: { "User-Agent": "AVRHomes/1.0" },
    });
  } catch (e: any) {
    return error(`Download failed: ${e?.message ?? "network error"}`, 400);
  }

  if (!res.ok) {
    return error(`Download failed: HTTP ${res.status}`, 400);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  let originalName = "remote-file";
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split("/").filter(Boolean).pop();
    if (base) originalName = decodeURIComponent(base);
  } catch {
    // keep default
  }
  if (!/\.\w+$/.test(originalName)) {
    originalName += ".mp4";
  }

  const resourceType = String(input.resource_type ?? "auto");

  const result = await upload(buffer, originalName, resourceType as any, { folder });
  if (!result.success) {
    return error(result.error ?? "Upload failed", 400);
  }

  return success(
    {
      url: result.url,
      public_id: result.public_id,
      format: ext(originalName) || null,
      bytes: buffer.length,
    },
    "File uploaded from URL successfully",
    201
  );
}

function ext(name: string): string {
  const m = /\.(\w+)$/.exec(name);
  return m ? m[1].toLowerCase() : "";
}
