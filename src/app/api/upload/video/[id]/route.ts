/**
 * DELETE /api/upload/video/{id} — delete a property video (authenticated).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { deleteByUrl } from "@/server/cloudinary";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const videoId = Number(id);
  if (!videoId || videoId <= 0) {
    return error("Invalid video ID", 400);
  }

  const video = await fetchOne("SELECT id, file_path FROM property_videos WHERE id = ?", [videoId]);
  if (!video) {
    return error("Video not found", 404);
  }

  if (video.file_path) {
    await deleteByUrl(video.file_path);
  }

  await execute("DELETE FROM property_videos WHERE id = ?", [videoId]);
  return success(null, "Video deleted successfully");
}
