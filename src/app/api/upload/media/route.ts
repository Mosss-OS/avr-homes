/**
 * POST /api/upload/media — upload any media file (image, video, document) to Cloudinary (authenticated).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { upload } from "@/server/cloudinary";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;

  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) {
    return error("No file uploaded", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const folder = String(fd.get("folder") ?? "avr-homes/media");

  let resourceType: "image" | "video" | "raw" | "auto" = "raw";
  if (file.type.startsWith("video/")) {
    resourceType = "video";
  } else if (file.type.startsWith("image/")) {
    resourceType = "image";
  } else {
    resourceType = "raw";
    const e = ext(file.name);
    if (["pdf", "doc", "docx", "xls", "xlsx"].includes(e)) {
      resourceType = "raw";
    } else if (["mp4", "webm", "mov", "avi", "mkv"].includes(e)) {
      resourceType = "video";
    }
  }

  const result = await upload(buffer, file.name, resourceType, { folder });
  if (!result.success) {
    return error(result.error ?? "Upload failed", 400);
  }

  return success(
    {
      url: result.url,
      public_id: result.public_id,
      format: ext(file.name) || null,
      bytes: buffer.length,
      resource_type: resourceType,
    },
    "Media uploaded successfully",
    201
  );
}

function ext(name: string): string {
  const m = /\.(\w+)$/.exec(name);
  return m ? m[1].toLowerCase() : "";
}
