/**
 * POST /api/agent/listings/{id}/documents — upload a verification document for a property (agent only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { getClientIp } from "@/server/rate-limiter";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agentId = await getAgentId(user);
  if (agentId instanceof NextResponse) return agentId;

  const { id } = await params;
  const propertyId = Number(id);
  if (!propertyId || propertyId <= 0) {
    return error("Invalid property ID", 400);
  }

  const property = await fetchOne("SELECT id FROM properties WHERE id = ? AND agent_id = ?", [propertyId, agentId]);
  if (!property) {
    return error("Property not found or access denied", 404);
  }

  const formData = await req.formData();
  const documentType = (formData.get("document_type") as string) ?? "";
  const file = formData.get("document") as File | null;

  const allowedTypes = ["certificate_of_occupancy", "survey_plan", "deed_of_assignment", "governors_consent", "agent_lasrera_id", "property_photo"];
  if (!allowedTypes.includes(documentType)) {
    return error("Invalid document type. Allowed: " + allowedTypes.join(", "), 422);
  }

  if (!file || file.size === 0) {
    return error("Document file is required", 400);
  }

  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const allowedExts = ["jpg", "jpeg", "png", "webp", "pdf"];
  const maxSize = 10 * 1024 * 1024;

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mime = file.type;

  if (!allowedMimes.includes(mime) || !allowedExts.includes(ext)) {
    return error("Invalid file type. Allowed: jpg, jpeg, png, webp, pdf", 422);
  }

  if (file.size > maxSize) {
    return error("File too large. Maximum size is 10MB", 422);
  }

  const filename = `doc_${propertyId}_${documentType}_${Date.now()}.${ext}`;
  const uploadDir = "/tmp/uploads/documents";
  const dest = `${uploadDir}/${filename}`;

  const fs = await import("node:fs/promises");
  await fs.mkdir(uploadDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(dest, Buffer.from(arrayBuffer));

  const docResult = await execute(
    "INSERT INTO property_documents (property_id, document_type, file_path, original_name, file_size) VALUES (?, ?, ?, ?, ?)",
    [propertyId, documentType, `uploads/documents/${filename}`, file.name, file.size]
  );
  const docId = Number(docResult.insertId);

  await execute(
    "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)",
    [user.id, "upload_document", "property_document", docId, getClientIp(req)]
  );

  const verification = await fetchOne(
    "SELECT id FROM property_verifications WHERE property_id = ? AND status = 'pending'",
    [propertyId]
  );

  let vfId: number;
  if (!verification) {
    const vfResult = await execute(
      "INSERT INTO property_verifications (property_id, agent_id, status) VALUES (?, ?, 'pending')",
      [propertyId, agentId]
    );
    vfId = Number(vfResult.insertId);
  } else {
    vfId = Number(verification.id);
  }

  await execute("UPDATE property_documents SET verification_id = ? WHERE id = ?", [vfId, docId]);

  return success(
    {
      document_id: docId,
      verification_id: vfId,
      document_type: documentType,
      file_path: `uploads/documents/${filename}`,
    },
    "Document uploaded successfully",
    201
  );
}

async function getAgentId(user: any): Promise<number | NextResponse> {
  if (user.agent_id) return Number(user.agent_id);
  const agent = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
  if (!agent) {
    return error("Agent profile not found", 404);
  }
  return Number(agent.id);
}
