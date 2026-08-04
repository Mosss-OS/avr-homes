/**
 * POST /api/auth/register — register a new regular (non-agent) user account.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Validator } from "@/server/validator";
import { error, success } from "@/server/response";
import { generateToken, generateRefreshToken } from "@/server/auth";
import { execute, fetchOne } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("name", "Full Name")
    .string("name", "Full Name", 100)
    .required("email", "Email")
    .email("email", "Email")
    .required("password", "Password")
    .minLength("password", 6, "Password");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();

  const existing = await fetchOne("SELECT id FROM users WHERE email = ?", [data.email]);
  if (existing) {
    return error("An account with this email already exists", 422, {
      email: ["Email is already registered"],
    });
  }

  const hashedPassword = bcrypt.hashSync(String(data.password), 12);

  const result = await execute(
    "INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)",
    [data.name, data.email, hashedPassword, "user", 1]
  );
  const userId = Number(result.insertId);

  const token = generateToken(userId);
  const refreshToken = await generateRefreshToken(userId);

  return success(
    {
      id: userId,
      token,
      refresh_token: refreshToken,
      user: {
        id: userId,
        name: data.name,
        email: data.email,
        role: "user",
      },
    },
    "Registration successful",
    201
  );
}
