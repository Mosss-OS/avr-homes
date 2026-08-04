/**
 * POST /api/auth/login — authenticate a user and return access & refresh tokens.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Validator } from "@/server/validator";
import { error, success } from "@/server/response";
import { getClientIp, check, recordFailure, clear } from "@/server/rate-limiter";
import { generateToken, generateRefreshToken } from "@/server/auth";
import { execute, fetchOne } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("email", "Email")
    .email("email", "Email")
    .required("password", "Password")
    .minLength("password", 6, "Password");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();
  const ip = getClientIp(req);

  const rate = check(ip, 5, 900);
  if (rate.blocked) {
    return error(
      `Too many login attempts. Please try again in ${Math.ceil(rate.retryAfter / 60)} minutes.`,
      429
    );
  }

  const user = await fetchOne(
    "SELECT id, name, email, password, role FROM users WHERE email = ? AND is_active = 1",
    [data.email]
  );

  if (!user || !bcrypt.compareSync(String(data.password), user.password)) {
    recordFailure(ip);
    return error("Invalid email or password", 401);
  }

  clear(ip);

  const userId = Number(user.id);
  const token = generateToken(userId);
  const refreshToken = await generateRefreshToken(userId);

  await execute(
    "INSERT INTO activity_logs (user_id, action, entity_type, ip_address) VALUES (?, ?, ?, ?)",
    [userId, "login", "user", ip]
  );

  return success(
    {
      token,
      refresh_token: refreshToken,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    "Login successful"
  );
}
