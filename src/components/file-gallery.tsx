import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, X, Loader2, Video, File, Image as ImageIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { sizeHint, uploadUrlToCloudinary } from "@/lib/media-utils";

interface FileGalleryItem {
  id?: number;
  url: string;
  file_name?: string;
  is_primary?: boolean;
  is_featured?: boolean;
}

interface FileGalleryProps {
  label: string;
  items: FileGalleryItem[];
  onChange: (items: FileGalleryItem[]) => void;
  accept?: string;
  mediaType?: "image" | "video" | "auto";
  folder?: string;
  maxFiles?: number;
  allowUrl?: boolean;
}

export function FileGallery({
  label,
  items,
  onChange,
  accept = "image/*,video/*",
  mediaType = "image",
  folder = "avr-homes/media",
  maxFiles = 10,
  allowUrl = false,
}: FileGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files).slice(0, maxFiles - items.length);
    if (fileArray.length === 0) return;

    setUploading(true);

    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://api.avrusthomes.com" : "http://localhost:8000");

    for (const file of fileArray) {
      try {
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

        const url = `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`;

        setProgress((p) => ({ ...p, [file.name]: 0 }));

        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              setProgress((p) => ({ ...p, [file.name]: Math.round((evt.loaded / evt.total) * 100) }));
            }
          };
          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
                resolve(data);
              } else {
                reject(new Error(data.error?.message || "Upload failed"));
              }
            } catch { reject(new Error("Invalid response")); }
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.open("POST", url);
          xhr.send(fd);
        });

        const newItem: FileGalleryItem = {
          url: result.secure_url,
          file_name: file.name,
        };
        onChange([...items, newItem]);
        toast.success(`${file.name} uploaded`);
      } catch (err: any) {
        console.error("Upload error:", err);
        toast.error(`Could not upload ${file.name}: ${err.message}`);
      }
    }

    setUploading(false);
    setProgress({});
    if (fileRef.current) fileRef.current.value = "";
  }

  async function addUrl() {
    const val = urlInput.trim();
    if (!val) return;
    setUrlInput("");
    if (/youtube\.com|youtu\.be|vimeo\.com/i.test(val)) {
      onChange([...items, { url: val, file_name: "URL" }]);
      toast.success("URL added");
      return;
    }
    const toastId = toast.loading("Fetching URL content...");
    const cloudUrl = await uploadUrlToCloudinary(val, folder);
    if (cloudUrl) {
      onChange([...items, { url: cloudUrl, file_name: "URL (Cloudinary)" }]);
      toast.success("URL uploaded to Cloudinary", { id: toastId });
    } else {
      onChange([...items, { url: val, file_name: "URL" }]);
      toast.success("URL added (direct link)", { id: toastId });
    }
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label} ({items.length}/{maxFiles})</label>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {items.map((item, i) => (
            <div key={i} className="group relative">
              {item.url.match(/\.(mp4|webm|mov|avi|mkv)$/i) || folder.includes("video") ? (
                <video src={item.url} className="h-24 w-36 rounded-lg object-cover" />
              ) : (
                <img src={item.url} alt="" className="h-24 w-36 rounded-lg object-cover" loading="lazy" />
              )}
              <button type="button" onClick={() => removeItem(i)}
                className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground shadow opacity-0 group-hover:opacity-100 transition">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(items.length < maxFiles || uploading) && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background p-4 text-center hover:border-primary transition-colors">
            {uploading ? (
              <div className="w-full text-center">
                {Object.entries(progress).map(([name, pct]) => (
                  <div key={name} className="mb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="truncate">{name}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {mediaType === "video" ? (
                  <Video className="mb-1 h-5 w-5 text-muted-foreground" />
                ) : (
                  <ImageIcon className="mb-1 h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">Drop files or click to upload</span>
                <span className="mt-1 text-xs text-muted-foreground/70">{sizeHint(mediaType)}</span>
              </>
            )}
            <input ref={fileRef} type="file" multiple accept={accept} onChange={(e) => e.target.files && uploadFiles(e.target.files)} className="hidden" />
          </label>
        </div>
      )}

      {allowUrl && (
        <div className="flex gap-2">
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste URL and add..."
            className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#C9A84C]"
            onKeyDown={(e) => e.key === "Enter" && addUrl()}
          />
          <button type="button" onClick={addUrl}
            className="rounded-lg border border-border px-3 text-xs font-medium hover:bg-secondary transition">
            Add
          </button>
        </div>
      )}
    </div>
  );
}
