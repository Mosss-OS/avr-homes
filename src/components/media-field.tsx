import { useState, useRef } from "react";
import { Upload, Link, File, X, Loader2, Video, Image as ImageIcon } from "lucide-react";
import { api } from "@/lib/api-client";

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
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await api.post<{ url: string }>("/api/upload/media", fd);
      const url = res.data.url;
      setPreview(url);
      onChange(url);
    } catch {
      // fallback
    }
    setUploading(false);
  }

  function handleUrlChange(val: string) {
    setPreview(val || null);
    onChange(val);
  }

  function clearValue() {
    setPreview(null);
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

  const showUrlInput = mode === "url" || value.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <button type="button" onClick={() => setMode("upload")}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${mode === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Upload className="inline h-3 w-3 mr-1" />Upload
          </button>
          <button type="button" onClick={() => setMode("url")}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${mode === "url" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Link className="inline h-3 w-3 mr-1" />URL
          </button>
        </div>
      </div>

      {(preview || uploading) && (
        <div className="relative inline-block">
          {uploading ? (
            <div className="flex h-32 w-48 items-center justify-center rounded-xl border-2 border-dashed border-border bg-background">
              <div className="text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">Uploading...</p>
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
              <Loader2 className="mb-2 h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                {mediaType === "video" ? (
                  <Video className="mb-2 h-6 w-6 text-muted-foreground" />
                ) : (
                  <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Click to upload"}
                </span>
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
          <input value={value} onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-[#C9A84C]" />
        </div>
      )}
    </div>
  );
}
