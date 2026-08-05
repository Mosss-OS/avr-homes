/**
 * GET /api/inquiries/{id}/messages — list messages for an inquiry (user by email or agent JWT).
 * POST /api/inquiries/{id}/messages — send a message on an inquiry thread.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { tryAuthenticate } from "@/server/auth";
import { fetchOne, fetchAll, execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id: inquiry_id } = await params;
  const inquiryId = Number(inquiry_id);
  if (!inquiryId || inquiryId <= 0) {
    return error("Invalid inquiry ID", 400);
  }

  const inquiry = await fetchOne("SELECT id, email FROM inquiries WHERE id = ?", [inquiryId]);
  if (!inquiry) {
    return error("Inquiry not found", 404);
  }

  let isAgent = false;
  let user: any = null;
  try {
    user = await tryAuthenticate(req);
    if (user) {
      isAgent = true;
      if (user.role !== "admin" && user.role !== "superadmin") {
        const owned = await fetchOne(
          `SELECT p.id FROM inquiries i
           JOIN properties p ON i.property_id = p.id
           JOIN agents a ON a.id = p.agent_id
           WHERE i.id = ? AND a.user_id = ?`,
          [inquiryId, user.id]
        );
        if (!owned) {
          return error("Unauthorized", 401);
        }
      }
    }
  } catch {
    user = null;
  }

  if (!user) {
    const userEmail = req.headers.get("x-inquiry-email") ?? "";
    if (!userEmail || userEmail.toLowerCase() !== String(inquiry.email).toLowerCase()) {
      return error("Unauthorized", 401);
    }
    isAgent = false;
  }

  const messages = await fetchAll("SELECT m.* FROM inquiry_messages m WHERE m.inquiry_id = ? ORDER BY m.created_at ASC", [inquiryId]);

  for (const msg of messages) {
    msg.id = Number(msg.id);
    msg.inquiry_id = Number(msg.inquiry_id);
    msg.is_read = Boolean(msg.is_read);
  }

  if (isAgent) {
    await execute(
      "UPDATE inquiry_messages SET is_read = 1 WHERE inquiry_id = ? AND sender_type = 'user' AND is_read = 0",
      [inquiryId]
    );
  }

  const inquiryData = await fetchOne(
    `SELECT i.*, p.title as property_title, p.slug as property_slug
     FROM inquiries i
     LEFT JOIN properties p ON i.property_id = p.id
     WHERE i.id = ?`,
    [inquiryId]
  );

  if (inquiryData) {
    inquiryData.id = Number(inquiryData.id);
    inquiryData.property_id = inquiryData.property_id ? Number(inquiryData.property_id) : null;
    inquiryData.is_read = Boolean(inquiryData.is_read);
  }

  return success({ inquiry: inquiryData, messages }, "Messages retrieved");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id: inquiry_id } = await params;
  const inquiryId = Number(inquiry_id);
  if (!inquiryId || inquiryId <= 0) {
    return error("Invalid inquiry ID", 400);
  }

  const input = await readJson(req);

  if (!input.body || String(input.body).trim() === "") {
    return error("Message body is required", 422);
  }
  const body = String(input.body).trim();

  if (body.length > 5000) {
    return error("Message too long (max 5000 characters)", 422);
  }

  const inquiry = await fetchOne("SELECT id, email, status FROM inquiries WHERE id = ?", [inquiryId]);
  if (!inquiry) {
    return error("Inquiry not found", 404);
  }

  let senderType = "user";
  let senderEmail: string | null = null;

  let user: any = null;
  try {
    user = await tryAuthenticate(req);
  } catch {
    user = null;
  }

  if (user) {
    senderType = "agent";
    senderEmail = user.email ?? null;

    if (user.role !== "admin" && user.role !== "superadmin") {
      const owned = await fetchOne(
        `SELECT p.id FROM inquiries i
         JOIN properties p ON i.property_id = p.id
         JOIN agents a ON a.id = p.agent_id
         WHERE i.id = ? AND a.user_id = ?`,
        [inquiryId, user.id]
      );
      if (!owned) {
        return error("Unauthorized", 401);
      }
    }

    if (inquiry.status === "new") {
      await execute("UPDATE inquiries SET status = ? WHERE id = ?", ["contacted", inquiryId]);
    }
  } else {
    const userEmail = req.headers.get("x-inquiry-email") ?? "";
    if (!userEmail || userEmail.toLowerCase() !== String(inquiry.email).toLowerCase()) {
      return error("Unauthorized", 401);
    }
    senderType = "user";
    senderEmail = inquiry.email;
  }

  const result = await execute(
    "INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_email, body) VALUES (?, ?, ?, ?)",
    [inquiryId, senderType, senderEmail, body]
  );

  const messageId = Number(result.insertId);

  return success(
    {
      id: messageId,
      inquiry_id: inquiryId,
      sender_type: senderType,
      body,
      created_at: new Date().toISOString(),
    },
    "Message sent",
    201
  );
}
