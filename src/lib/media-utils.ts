import { api } from "@/lib/api-client";

export async function uploadUrlToCloudinary(
  url: string,
  folder: string = "avr-homes/media",
  onProgress?: (pct: number) => void
): Promise<string | null> {
  // Skip embed-only platforms — can't fetch those
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) return null;

  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size === 0) return null;

    const ext = url.match(/\.(\w+)(\?|$)/)?.[1] || "mp4";
    const mime = blob.type || (ext.match(/mp4|webm|mov/i) ? "video/mp4" : "image/jpeg");
    const fileName = `url-upload-${Date.now()}.${ext}`;
    const file = new File([blob], fileName, { type: mime });

    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://api.avrusthomes.com" : "http://localhost:8000");

    const signRes = await api.get<{
      cloud_name: string; api_key: string; timestamp: number;
      signature: string; folder: string;
    }>(`/api/upload/sign?folder=${encodeURIComponent(folder)}`);

    const { cloud_name, api_key, timestamp, signature, folder: cloudFolder } = signRes.data;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", api_key);
    fd.append("timestamp", String(timestamp));
    fd.append("signature", signature);
    fd.append("folder", cloudFolder);

    return await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
            resolve(data.secure_url);
          } else {
            reject(new Error(data.error?.message || "Upload failed"));
          }
        } catch { reject(new Error("Invalid response")); }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`);
      xhr.send(fd);
    });
  } catch {
    return null;
  }
}

export function sizeHint(mediaType: "image" | "video" | "document"): string {
  if (mediaType === "video") return "Max 100 MB per video.";
  if (mediaType === "image") return "Max 10 MB per image.";
  return "";
}
