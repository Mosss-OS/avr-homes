/**
 * Simple file-based rate limiter for login attempts.
 *
 * Tracks failed login attempts by IP address and blocks the IP after the
 * maximum attempts within the time window. Mirrors the PHP `RateLimiter`.
 *
 * @module server/rate-limiter
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

interface RateState {
  attempts: number[];
}

function getDir(): string {
  const dir = process.env.RATE_LIMIT_DIR || path.join(process.cwd(), ".ratelimit");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function filePath(key: string): string {
  return path.join(getDir(), `${crypto.createHash("md5").update(key).digest("hex")}.json`);
}

function readState(file: string): RateState {
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (Array.isArray(data?.attempts)) return data as RateState;
    }
  } catch {
    /* corrupt file — treat as fresh */
  }
  return { attempts: [] };
}

/**
 * Check if a key (e.g. IP address) is currently rate-limited.
 */
export function check(key: string, maxAttempts = 5, windowSeconds = 900): {
  blocked: boolean;
  remaining: number;
  retryAfter: number;
} {
  const file = filePath(key);
  const now = Math.floor(Date.now() / 1000);

  if (!fs.existsSync(file)) {
    return { blocked: false, remaining: maxAttempts, retryAfter: 0 };
  }

  const data = readState(file);
  data.attempts = data.attempts.filter((ts) => ts > now - windowSeconds);
  fs.writeFileSync(file, JSON.stringify(data), { flag: "w" });

  const count = data.attempts.length;
  if (count >= maxAttempts) {
    const oldest = Math.min(...data.attempts);
    const retryAfter = oldest + windowSeconds - now;
    return { blocked: true, remaining: 0, retryAfter: Math.max(retryAfter, 1) };
  }

  return { blocked: false, remaining: maxAttempts - count, retryAfter: 0 };
}

/** Record a failed attempt for the given key. */
export function recordFailure(key: string): void {
  const file = filePath(key);
  const data = readState(file);
  data.attempts.push(Math.floor(Date.now() / 1000));
  fs.writeFileSync(file, JSON.stringify(data), { flag: "w" });
}

/** Clear all recorded failures for a key (call on successful login). */
export function clear(key: string): void {
  const file = filePath(key);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

/**
 * Get the client IP address, respecting X-Forwarded-For for proxied requests.
 */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || "0.0.0.0";
  return ip;
}
