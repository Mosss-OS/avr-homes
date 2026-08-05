export async function uploadUrlToCloudinary(
  url: string,
  folder: string = "avr-homes/media",
  onProgress?: (pct: number) => void
): Promise<string | null> {
  // Skip embed-only platforms — can't fetch those
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  try {
    const res = await fetch(`${apiUrl}/api/upload/from-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url, folder }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      console.warn("Server-side URL upload failed:", body.message || body.error);
      return null;
    }

    const resultUrl: string = body.data?.url;
    if (resultUrl) {
      onProgress?.(100);
    }
    return resultUrl || null;
  } catch (err) {
    console.warn("URL upload proxy error:", err);
    return null;
  }
}

/**
 * Upload an image file directly to Cloudinary from the browser using a
 * signed upload (bypasses the slow server-side double hop). Resizes large
 * images client-side first so only a compressed version travels over the wire.
 *
 * @param file        The image file to upload.
 * @param folder      Cloudinary folder to store into.
 * @param onProgress  Optional progress callback (0-100).
 * @returns The Cloudinary secure URL, or null on failure.
 */
export async function uploadImageToCloudinary(
  file: File,
  folder: string = "avr-homes/properties",
  onProgress?: (pct: number) => void
): Promise<string | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const signRes = await fetch(`${apiUrl}/api/upload/sign?folder=${encodeURIComponent(folder)}`, {
      credentials: "include",
    });
    const signBody = await signRes.json();
    if (!signBody.success) {
      console.warn("Failed to get upload signature:", signBody.message || signBody.error);
      return null;
    }
    const { cloud_name, api_key, timestamp, signature, folder: cloudFolder } = signBody.data;

    const uploadFile = await resizeImageForUpload(file);

    const fd = new FormData();
    fd.append("file", uploadFile);
    fd.append("api_key", api_key);
    fd.append("timestamp", String(timestamp));
    fd.append("signature", signature);
    fd.append("folder", cloudFolder);

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`;

    const result = await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) onProgress?.(Math.round((evt.loaded / evt.total) * 100));
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
            resolve(data.secure_url);
          } else {
            reject(new Error(data.error?.message || "Cloudinary rejected the file"));
          }
        } catch {
          reject(new Error("Invalid response from Cloudinary"));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.open("POST", cloudinaryUrl);
      xhr.send(fd);
    });

    return result;
  } catch (err) {
    console.warn("Direct Cloudinary upload failed:", err);
    return null;
  }
}

const MAX_IMAGE_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

/**
 * Resize/compress an image client-side before upload so large camera photos
 * don't consume upload bandwidth. Falls back to the original file when the
 * browser can't decode it.
 */
async function resizeImageForUpload(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION && file.size < 800 * 1024) {
      bitmap.close();
      return file;
    }
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, outW, outH);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export function sizeHint(mediaType: "image" | "video" | "document" | "auto"): string {
  if (mediaType === "video") return "Max 100 MB per video.";
  if (mediaType === "image") return "Max 10 MB per image.";
  return "";
}
