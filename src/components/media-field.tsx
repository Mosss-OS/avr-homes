import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, Link, File, X, Loader2, Video, Image as ImageIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { sizeHint, uploadUrlToCloudinary } from "@/lib/media-utils";

interface MediaFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  mediaType?: "image" | "video" | "document";
  folder?: string;
  placeholder?: string;
  helpText?: string;
}

export function MediaField({
  label,
  value,
  onChange,
  accept = "image/*,video/*,.pdf,.doc,.docx",
  mediaType = "image",
  folder = "avr-homes/media",
  placeholder = "Paste URL or upload a file",
  helpText,
}: MediaFieldProps) {
  const [mode, setMode] = useState<"url" | "upload">(value ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [processingUrl, setProcessingUrl] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [urlInput, setUrlInput] = useState(value || "");
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadViaProxy(file: File, loadingId: string | number): Promise<string> {
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://api.avrusthomes.com" : "http://localhost:8000");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        setProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    return new Promise<string>((resolve, reject) => {
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            const url = data.data?.url || data.data?.secure_url || data.url || data.secure_url;
            if (url) resolve(url);
            else reject(new Error("Server did not return a URL"));
          } else {
            reject(new Error(data.message || data.error || "Upload failed"));
          }
        } catch {
          reject(new Error("Invalid response from server"));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.open("POST", `${apiUrl}/api/upload`);
      xhr.send(fd);
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);
    const loadingId = toast.loading(`Uploading ${file.name}...`);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://api.avrusthomes.com" : "http://localhost:8000");

      // Try direct Cloudinary upload first
      let url: string;
      try {
        const signRes = await api.get<{
          cloud_name: string; api_key: string; timestamp: number;
          signature: string; folder: string;
        }>(`/api/upload/sign?folder=${encodeURIComponent(folder)}`);

        const { cloud_name, api_key, timestamp, signature, folder: cloudFolder } = signRes.data;

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`;

        const fd = new FormData();
        fd.append("file", file);
        fd.append("api_key", api_key);
        fd.append("timestamp", String(timestamp));
        fd.append("signature", signature);
        fd.append("folder", cloudFolder);

        url = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              setProgress(Math.round((evt.loaded / evt.total) * 100));
            }
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
      } catch (directErr) {
        console.warn("Direct upload failed, falling back to proxy:", directErr);
        toast.loading("Switching to server proxy...", { id: loadingId });
        url = await uploadViaProxy(file, loadingId);
      }

      setPreview(url);
      onChange(url);
      toast.success(`${file.name} uploaded`, { id: loadingId });
    } catch (err) {
      console.error("Upload error:", err);
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(`${msg}. For large files try pasting a URL instead.`, { id: loadingId });
    }

    setUploading(false);
  }

  async function handleUrlConfirm() {
    const val = urlInput.trim();
    if (!val) return;
    setPreview(val);
    onChange(val);
    if (/youtube\.com|youtu\.be|vimeo\.com/i.test(val)) return;
    setProcessingUrl(true);
    setProgress(0);
    const cloudUrl = await uploadUrlToCloudinary(val, folder, (pct) => setProgress(pct));
    if (cloudUrl) {
      setPreview(cloudUrl);
      onChange(cloudUrl);
    }
    setProcessingUrl(false);
  }

  function clearValue() {
    setPreview(null);
    setUrlInput("");
    onChange("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function showPreview() {
    if (!preview) return null;
    if (mediaType === "video") {
      return (
        <video src={preview} className="max-h-40 rounded-lg object-cover" controls />
      );
    }
    if (mediaType === "document") {
      return (
        <a href={preview} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3 text-sm hover:bg-secondary/50">
          <File className="h-5 w-5 text-muted-foreground" />
          <span className="truncate text-muted-foreground">{preview}</span>
        </a>
      );
    }
    return (
      <img src={preview} alt="Preview" className="max-h-40 rounded-lg object-cover" />
    );
  }

  const showUrlInput = mode === "url" || urlInput.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <button type="button" onClick={() => setMode("upload")}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${mode === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Upload className="inline h-3 w-3 mr-1" />Upload
          </button>
          <button type="button" onClick={() => { setMode("url"); setUrlInput(value); }}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${mode === "url" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Link className="inline h-3 w-3 mr-1" />URL
          </button>
        </div>
      </div>

      {(preview || uploading) && (
        <div className="relative inline-block">
          {uploading ? (
            <div className="flex w-64 items-center justify-center rounded-xl border-2 border-dashed border-border bg-background p-4">
              <div className="w-full text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">Uploading... {progress}%</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          ) : (
            showPreview()
          )}
          <button type="button" onClick={clearValue}
            className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground shadow">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {mode === "upload" && !preview && (
        <div>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background p-6 text-center hover:border-primary transition-colors">
            {uploading ? (
              <div className="w-full text-center">
                <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Uploading... {progress}%</span>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <>
                {mediaType === "video" ? (
                  <Video className="mb-2 h-6 w-6 text-muted-foreground" />
                ) : (
                  <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">Click to upload</span>
                <span className="mt-1 text-xs text-muted-foreground/70">{sizeHint(mediaType)}</span>
                {helpText && <span className="mt-1 text-xs text-muted-foreground">{helpText}</span>}
              </>
            )}
            <input ref={fileRef} type="file" accept={accept} onChange={handleFile} className="hidden" />
          </label>
        </div>
      )}

      {showUrlInput && (
        <div className="relative">
          <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onBlur={handleUrlConfirm}
            onKeyDown={(e) => e.key === "Enter" && handleUrlConfirm()}
            placeholder={placeholder}
            className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-[#C9A84C]" />
          {processingUrl && (
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {progress}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}
