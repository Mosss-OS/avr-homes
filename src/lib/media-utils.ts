export async function uploadUrlToCloudinary(
  url: string,
  folder: string = "avr-homes/media",
  onProgress?: (pct: number) => void
): Promise<string | null> {
  // Skip embed-only platforms — can't fetch those
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) return null;

  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://api.avrusthomes.com" : "http://localhost:8000");

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

export function sizeHint(mediaType: "image" | "video" | "document"): string {
  if (mediaType === "video") return "Max 100 MB per video.";
  if (mediaType === "image") return "Max 10 MB per image.";
  return "";
}
