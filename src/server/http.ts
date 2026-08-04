/**
 * Shared request helpers for Next.js route handlers.
 *
 * @module server/http
 */

import { NextRequest } from "next/server";

/**
 * Read and parse a JSON request body, falling back to an empty object.
 * Form submissions are not JSON-encoded.
 */
export async function readJson(req: NextRequest): Promise<Record<string, any>> {
  try {
    if (req.method === "GET" || req.method === "HEAD") return {};
    const text = await req.text();
    if (!text) return {};
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Extract a single path parameter from a Next route segment. */
export function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0];
  return value ?? "";
}
