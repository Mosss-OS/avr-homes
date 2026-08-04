/**
 * POST /api/upload — upload a single property image (authenticated).
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
  const file = fd.get("file");
  if (!(file instanceof File)) {
    return error("No file uploaded", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await upload(buffer, file.name, "image", { folder: "avr-homes/properties" });
  if (!result.success) {
    return error(result.error ?? "Upload failed", 400);
  }

  const url = result.url!;
  const propertyId = fd.get("property_id") ? Number(fd.get("property_id")) : null;
  const isPrimary = fd.get("is_primary") ? 1 : 0;

  if (propertyId) {
    const inserted = await execute(
      `INSERT INTO property_images (property_id, file_path, file_name, file_size, mime_type, is_primary)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [propertyId, url, file.name, buffer.length, "image/" + (ext(file.name) || "jpeg"), isPrimary]
    );
    const imageId = Number(inserted.insertId);

    if (isPrimary) {
      await execute("UPDATE properties SET image = ? WHERE id = ?", [url, propertyId]);
    }

    return success(
      { id: imageId, url, path: url, file_name: file.name },
      "File uploaded successfully",
      201
    );
  }

  return success(
    { url, path: url, file_name: file.name },
    "File uploaded successfully",
    201
  );
}

function ext(name: string): string {
  const m = /\.(\w+)$/.exec(name);
  return m ? m[1].toLowerCase() : "";
}
