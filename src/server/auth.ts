/**
 * Authentication middleware for Next.js route handlers.
 *
 * Mirrors the PHP `AuthMiddleware`: bearer-token extraction, HS256 JWT
 * generation/validation, refresh-token persistence, and role-based access
 * control (user / agent / admin).
 *
 * @module server/auth
 */

import { NextRequest, NextResponse } from "next/server";
import jwt, { type JwtPayload } from "jsonwebtoken";
import crypto from "node:crypto";
import { error } from "./response";
import { execute, fetchOne } from "./db";

/** Authenticated user shape returned by the auth helpers. */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  admin_role_id: number | null;
  [key: string]: unknown;
}

function getSecret(): string {
  return process.env.JWT_SECRET ?? "change-this-to-a-random-secret-key";
}

/**
 * Extract the Bearer token from the Authorization header or `?token=` query.
 */
function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (match) return match[1];
  if (req.method === "GET") {
    const token = req.nextUrl.searchParams.get("token");
    if (token) return token;
  }
  return null;
}

/**
 * Generate a signed HS256 JWT access token valid for 24 hours.
 */
export function generateToken(userId: number): string {
  const secret = getSecret();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 86400;
  return jwt.sign({ user_id: userId, iat: issuedAt, exp: expiresAt }, secret, { algorithm: "HS256" });
}

/**
 * Validate a JWT token: verify signature and check expiration.
 * Returns the decoded payload or null on failure.
 */
function validateToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
    return typeof decoded === "string" ? null : decoded;
  } catch {
    return null;
  }
}

/**
 * Generate a cryptographically random refresh token (7-day TTL) and persist it.
 */
export async function generateRefreshToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 604800 * 1000).toISOString().slice(0, 19).replace("T", " ");
  await execute("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)", [
    userId,
    token,
    expiresAt,
  ]);
  return token;
}

/**
 * Load the active user row for a user id.
 */
async function loadUser(userId: number): Promise<AuthUser | null> {
  return fetchOne(
    "SELECT id, name, email, role, admin_role_id FROM users WHERE id = ? AND is_active = 1",
    [userId]
  );
}

/**
 * Authenticate a user from the bearer token with an optional role check.
 * Returns a NextResponse error (401/403) when authentication fails — callers
 * should `return` it. Returns the user row on success.
 */
export async function authenticate(req: NextRequest, requiredRole?: string | null): Promise<AuthUser | NextResponse> {
  const token = getBearerToken(req);
  if (!token) return error("Authentication required", 401);

  const payload = validateToken(token);
  if (!payload || typeof payload.user_id !== "number") return error("Invalid or expired token", 401);

  const user = await loadUser(payload.user_id);
  if (!user) return error("User not found or inactive", 401);

  if (requiredRole && user.role !== requiredRole && user.role !== "superadmin") {
    return error("Insufficient permissions", 403);
  }

  return user;
}

/**
 * Authenticate a user from the bearer token if present, returning null when
 * the request is unauthenticated or the token is invalid/expired.
 */
export async function tryAuthenticate(req: NextRequest): Promise<AuthUser | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  const payload = validateToken(token);
  if (!payload || typeof payload.user_id !== "number") return null;
  return loadUser(payload.user_id);
}

/**
 * Authenticate and ensure the user has an active agent profile.
 * Injects `agent_id` into the returned user object.
 */
export async function authenticateAgent(req: NextRequest): Promise<AuthUser | NextResponse> {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult as AuthUser;

  if (user.role === "admin" || user.role === "superadmin") return user;
  if (user.role !== "agent") {
    const agent = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
    if (!agent) return error("Agent profile not found", 404);
    user.agent_id = Number(agent.id);
  }
  return user;
}

/**
 * Authenticate and require the admin role.
 */
export async function authenticateAdmin(req: NextRequest): Promise<AuthUser | NextResponse> {
  return authenticate(req, "admin");
}

/**
 * Require a specific permission for the current admin user.
 * Superadmin always passes. Returns a NextResponse error on failure.
 */
export async function requirePermission(req: NextRequest, permissionSlug: string): Promise<AuthUser | NextResponse> {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult as AuthUser;
  if (user.role === "superadmin") return user;

  if (user.admin_role_id) {
    const count = await fetchOne(
      `SELECT COUNT(*) AS c FROM admin_role_permissions rp
       INNER JOIN admin_permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = ? AND p.slug = ?`,
      [user.admin_role_id, permissionSlug]
    );
    if (Number(count?.c ?? 0) > 0) return user;
  }

  const count = await fetchOne(
    `SELECT COUNT(*) AS c FROM admin_role_permissions rp
     INNER JOIN admin_permissions p ON p.id = rp.permission_id
     INNER JOIN admin_roles r ON r.id = rp.role_id
     WHERE r.slug = ? AND p.slug = ?`,
    [user.role, permissionSlug]
  );
  if (Number(count?.c ?? 0) > 0) return user;

  return error(`Insufficient permissions: ${permissionSlug} required`, 403);
}

/**
 * Type guard: does the result of an auth helper represent a user (vs error response)?
 */
export function isUser(result: AuthUser | NextResponse): result is AuthUser {
  return !(result instanceof NextResponse);
}
