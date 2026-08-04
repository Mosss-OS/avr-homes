/**
 * GET /api/upload/sign — return signed upload parameters for direct browser-to-Cloudinary upload (authenticated).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { signUpload } from "@/server/cloudinary";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;

  const folder = req.nextUrl.searchParams.get("folder") ?? "avr-homes/media";

  try {
    const signed = signUpload(folder);
    return success(signed, "Upload signature generated");
  } catch {
    return error("Cloudinary not configured", 500);
  }
}
