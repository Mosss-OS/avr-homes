/**
 * POST /api/upload/attach — attach already-uploaded Cloudinary URLs to a property (authenticated).
 *
 * Body: { property_id, images: [{ url, is_primary? }] }
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
  const user = auth;

  const input = await readJson(req);
  const propertyId = Number(input.property_id ?? 0);
  const images = input.images;

  if (!propertyId || propertyId <= 0) {
    return error("Property ID is required", 422);
  }
  if (!Array.isArray(images) || images.length === 0) {
    return error("images is required", 422);
  }

  const agent = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
  if (!agent) {
    return error("Agent profile not found. Complete your profile first.", 404);
  }

  const property = await fetchOne("SELECT id FROM properties WHERE id = ? AND agent_id = ?", [propertyId, Number(agent.id)]);
  if (!property) {
    return error("Property not found", 404);
  }

  const attached: Record<string, any>[] = [];

  for (const img of images as any[]) {
    const url = String(img?.url ?? "").trim();
    if (!url) continue;

    const isPrimary = img.is_primary ? 1 : 0;
    let fileName = "cloudinary-image";
    try {
      const pathname = new URL(url).pathname;
      const base = pathname.split("/").filter(Boolean).pop();
      if (base) fileName = decodeURIComponent(base);
    } catch {
      fileName = "cloudinary-image";
    }
    const e = ext(fileName);
    const mime = e === "png" ? "image/png" : e === "webp" ? "image/webp" : "image/jpeg";

    const inserted = await execute(
      `INSERT INTO property_images (property_id, file_path, file_name, file_size, mime_type, is_primary)
       VALUES (?, ?, ?, 0, ?, ?)`,
      [propertyId, url, fileName, mime, isPrimary]
    );
    const imageId = Number(inserted.insertId);

    if (isPrimary) {
      await execute("UPDATE properties SET image = ? WHERE id = ?", [url, propertyId]);
    }

    attached.push({ id: imageId, url, path: url, file_name: fileName });
  }

  if (attached.length === 0) {
    return error("No valid images supplied", 422);
  }

  return success(
    { uploaded: attached, errors: [] },
    `${attached.length} image(s) attached successfully`,
    201
  );
}

function ext(name: string): string {
  const m = /\.(\w+)$/.exec(name);
  return m ? m[1].toLowerCase() : "";
}
