/**
 * CloudinaryService — upload files to Cloudinary via REST API.
 *
 * Uses HTTP Basic Auth (API Key / API Secret) so no SDK is needed.
 * Mirrors the PHP `CloudinaryService`.
 *
 * @module server/cloudinary
 */

import crypto from "node:crypto";

function config(): { cloudName: string; apiKey: string; apiSecret: string } {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env"
    );
  }

  return { cloudName, apiKey, apiSecret };
}

function signParams(params: Record<string, string>, apiSecret: string): string {
  const keys = Object.keys(params).sort();
  const str = keys.map((k) => `${k}=${params[k]}`).join("&");
  return crypto.createHash("sha1").update(str + apiSecret).digest("hex");
}

/**
 * Upload a file buffer to Cloudinary.
 *
 * @param fileBuffer  File contents.
 * @param originalName Original filename (used for public_id).
 * @param resourceType 'image' | 'video' | 'raw' | 'auto'.
 * @param options     Extra upload params (e.g. folder, tags).
 */
export async function upload(
  fileBuffer: Buffer,
  originalName: string,
  resourceType = "auto",
  options: Record<string, any> = {}
): Promise<{ success: boolean; url?: string; public_id?: string; error?: string }> {
  let cloudName: string, apiKey: string, apiSecret: string;
  try {
    ({ cloudName, apiKey, apiSecret } = config());
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    return { success: false, error: "File not found" };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options.folder ?? "avr-homes";
  const publicId = options.public_id ?? `${originalName.replace(/\.[^.]+$/, "")}_${timestamp}`;

  const paramsToSign: Record<string, string> = { timestamp: String(timestamp), folder, public_id: publicId };
  if (options.tags) paramsToSign.tags = options.tags;
  const signature = signParams(paramsToSign, apiSecret);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const timeout = resourceType === "video" ? 300000 : 120000;

  const fd = new FormData();
  fd.append("timestamp", String(timestamp));
  fd.append("folder", folder);
  fd.append("public_id", publicId);
  if (options.tags) fd.append("tags", options.tags);
  fd.append("api_key", apiKey);
  fd.append("signature", signature);
  fd.append("file", new Blob([fileBuffer]), originalName);

  try {
    const res = await fetch(url, {
      method: "POST",
      body: fd,
      headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}` },
      signal: AbortSignal.timeout(timeout),
    });
    const httpCode = res.status;
    const data = (await res.json().catch(() => ({}))) as Record<string, any>;

    if (httpCode !== 200 || !data || data.error) {
      const errMsg = data.error?.message ?? `HTTP ${httpCode}`;
      return { success: false, error: `Cloudinary error: ${errMsg}` };
    }

    return { success: true, url: data.secure_url, public_id: data.public_id };
  } catch (err) {
    return { success: false, error: `request error: ${(err as Error).message}` };
  }
}

/**
 * Delete a resource from Cloudinary by its public URL.
 * Only acts on res.cloudinary.com URLs; returns success for others.
 */
export async function deleteByUrl(cloudinaryUrl: string): Promise<{ success: boolean; error?: string }> {
  if (!cloudinaryUrl.includes("res.cloudinary.com/")) {
    return { success: true };
  }

  let cloudName: string, apiKey: string, apiSecret: string;
  try {
    ({ cloudName, apiKey, apiSecret } = config());
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  let resourceType = "image";
  const typeMatch = /#\/(image|video|raw)\/upload\//.exec(cloudinaryUrl);
  if (typeMatch) resourceType = typeMatch[1];

  const u = new URL(cloudinaryUrl);
  let path = u.pathname;
  path = path.replace(/^\/[^/]+\/(image|video|raw)\/upload\/[^/]+\//, "");
  path = path.replace(/\.\w+$/, "");
  if (!path) return { success: false, error: "Could not parse public_id from URL" };

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ timestamp: String(timestamp), public_id: path }, apiSecret);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
  const fd = new FormData();
  fd.append("public_id", path);
  fd.append("api_key", apiKey);
  fd.append("signature", signature);
  fd.append("timestamp", String(timestamp));

  try {
    const res = await fetch(url, {
      method: "POST",
      body: fd,
      signal: AbortSignal.timeout(30000),
    });
    const httpCode = res.status;
    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (httpCode !== 200 || !data || (data.result ?? "") !== "ok") {
      const errMsg = data.error?.message ?? `HTTP ${httpCode}`;
      return { success: false, error: `Cloudinary delete error: ${errMsg}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: `request error: ${(err as Error).message}` };
  }
}

/**
 * Generate a signed upload URL for direct browser uploads.
 */
export function signUpload(folder: string): {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;
} {
  const { cloudName, apiKey, apiSecret } = config();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ timestamp: String(timestamp), folder }, apiSecret);
  return { cloud_name: cloudName, api_key: apiKey, timestamp, signature, folder };
}
