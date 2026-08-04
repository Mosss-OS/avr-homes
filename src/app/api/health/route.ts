/**
 * GET /api/health — health check endpoint.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { exec } from "node:child_process";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  let ffmpeg: string;
  try {
    ffmpeg = await new Promise((resolve) => {
      exec("which ffmpeg 2>/dev/null", (error, stdout) => {
        if (!error && stdout.trim()) {
          resolve(stdout.trim().split("\n")[0]);
        } else {
          resolve("not found");
        }
      });
    });
  } catch (e: any) {
    ffmpeg = "not found";
  }

  return success(
    {
      status: "ok",
      time: new Date().toISOString(),
      node: process.version,
      ffmpeg,
    },
    undefined
  );
}
