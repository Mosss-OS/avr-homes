/**
 * POST /api/upload/video-gallery — upload multiple videos for a property (authenticated).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { execute } from "@/server/db";
import { upload } from "@/server/cloudinary";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;

  const fd = await req.formData();
  const propertyId = fd.get("property_id") ? Number(fd.get("property_id")) : null;
  if (!propertyId) {
    return error("Property ID is required", 400);
  }

  const files = fd.getAll("files");
  const uploaded: Record<string, any>[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await upload(buffer, file.name, "video", { folder: "avr-homes/videos" });
    if (!result.success) {
      errors.push(`File ${file.name}: ${result.error}`);
      continue;
    }

    const inserted = await execute(
      `INSERT INTO property_videos (property_id, file_path, file_name, file_size, mime_type, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [propertyId, result.url, file.name, buffer.length, file.type || "video/mp4", uploaded.length]
    );
    const videoId = Number(inserted.insertId);

    uploaded.push({ id: videoId, url: result.url, file_name: file.name });
  }

  return success(
    { uploaded, errors },
    `${uploaded.length} video(s) uploaded successfully`
  );
}
