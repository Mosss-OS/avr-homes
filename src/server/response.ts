/**
 * Standard JSON response helpers for Next.js route handlers.
 *
 * Mirrors the PHP `Response` utility: every response is wrapped in the
 * `{ success, message, data }` envelope the frontend expects.
 *
 * @module server/response
 */

import { NextResponse } from "next/server";

/**
 * Send a JSON response with the standard envelope.
 */
export function json(data: unknown, status = 200, message = "OK"): NextResponse {
  return NextResponse.json(
    {
      success: status >= 200 && status < 300,
      message,
      data,
    },
    { status }
  );
}

/**
 * Send a success response.
 */
export function success(data: unknown, message = "Operation successful", status = 200): NextResponse {
  return json(data, status, message);
}

/**
 * Send an error response with optional per-field validation errors.
 */
export function error(message: string, status = 400, errors: unknown = null): NextResponse {
  const payload: Record<string, unknown> = { success: false, message };
  if (errors !== null) {
    payload.errors = errors;
  }
  return NextResponse.json(payload, { status });
}
