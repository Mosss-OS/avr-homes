/**
 * GET /api/agent/listings/{id}/verification — get verification status for a property (agent only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
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

  const property = await fetchOne("SELECT id, title, is_verified, verified_at, verification_expires_at FROM properties WHERE id = ? AND agent_id = ?", [propertyId, agentId]);
  if (!property) {
    return error("Property not found or access denied", 404);
  }

  const verification = await fetchOne(
    `SELECT pv.*, u.name as admin_name
     FROM property_verifications pv
     LEFT JOIN users u ON u.id = pv.admin_id
     WHERE pv.property_id = ?
     ORDER BY pv.created_at DESC
     LIMIT 1`,
    [propertyId]
  );

  const documents = await fetchAll(
    "SELECT id, document_type, file_path, original_name, created_at FROM property_documents WHERE property_id = ? ORDER BY created_at DESC",
    [propertyId]
  );

  if (verification) {
    verification.id = Number(verification.id);
    verification.property_id = Number(verification.property_id);
    verification.agent_id = Number(verification.agent_id);
    verification.admin_id = verification.admin_id ? Number(verification.admin_id) : null;
  }

  for (const doc of documents) {
    doc.id = Number(doc.id);
  }

  return success(
    {
      property: {
        id: Number(property.id),
        title: property.title,
        is_verified: Boolean(property.is_verified),
        verified_at: property.verified_at,
        verification_expires_at: property.verification_expires_at,
      },
      verification,
      documents,
    },
    "Verification status retrieved"
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
