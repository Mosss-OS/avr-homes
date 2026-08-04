/**
 * POST /api/agent/profile/avatar — update the authenticated agent's avatar.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { updatePhoto } from "@/server/models/agent";
import { upload } from "@/server/cloudinary";
import { getClientIp } from "@/server/rate-limiter";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const db = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
  if (!db) {
    return error("Agent profile not found", 404);
  }

  const agentId = Number(db.id);

  const fd = await req.formData();
  const file = fd.get("avatar");
  if (!(file instanceof File)) {
    return error("Avatar file is required", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const mime = file.type || "";
  const name = file.name || "";
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  const allowedExts = ["jpg", "jpeg", "png", "webp"];

  if (!allowedTypes.includes(mime) || !allowedExts.includes(ext)) {
    return error("Invalid file type. Allowed: jpg, jpeg, png, webp", 422);
  }

  const maxSize = 5 * 1024 * 1024;
  if (buffer.length > maxSize) {
    return error("File too large. Maximum size is 5MB", 422);
  }

  const result = await upload(buffer, name, "image", { folder: "avr-homes/avatars" });
  if (!result.success || !result.url) {
    return error(result.error ?? "Failed to upload avatar", 500);
  }

  const photoUrl = result.url;

  await updatePhoto(agentId, photoUrl);

  await execute(
    "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)",
    [user.id, "update_avatar", "agent", agentId, getClientIp(req)]
  );

  return success({ photo_url: photoUrl }, "Avatar updated successfully");
}
