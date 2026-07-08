import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Search, Upload, Star, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/gallery")({
  component: AdminGallery,
});

interface PropertyImage {
  id: number; property_id: number; file_path: string;
  file_name: string; is_primary: boolean; sort_order: number;
}

interface PropertyOption {
  id: number; title: string;
}

function AdminGallery() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedProp, setSelectedProp] = useState<number | "">("");
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) { navigate({ to: "/admin/login" }); return; }
    api.get<{ data: PropertyOption[] }>("/api/admin/properties?per_page=200")
      .then((r) => setProperties(r.data.data))
      .catch(() => toast.error("Failed to load properties"));
  }, []);

  const fetchImages = useCallback(async () => {
    if (!selectedProp) { setImages([]); return; }
    setLoading(true);
    try {
      const res = await api.get<PropertyImage[]>(`/api/admin/properties/${selectedProp}/images`);
      setImages(res.data);
    } catch { toast.error("Failed to load images"); }
    setLoading(false);
  }, [selectedProp]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedProp || !e.target.files?.length) return;
    setUploading(true);
    const form = new FormData();
    for (const f of e.target.files) form.append("files[]", f);
    form.append("property_id", String(selectedProp));
    try {
      await api.post("/api/admin/properties/upload-gallery", form, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Images uploaded");
      fetchImages();
    } catch { toast.error("Failed to upload"); }
    setUploading(false);
    e.target.value = "";
  }

  async function setPrimary(img: PropertyImage) {
    try { await api.put(`/api/admin/properties/images/${img.id}/primary`); toast.success("Primary image updated"); fetchImages(); }
    catch { toast.error("Failed to update"); }
  }

  async function deleteImage(img: PropertyImage) {
    if (!confirm(`Delete ${img.file_name}?`)) return;
    try { await api.delete(`/api/admin/properties/images/${img.id}`); toast.success("Deleted"); fetchImages(); }
    catch { toast.error("Failed to delete"); }
  }

  async function reorder(img: PropertyImage, dir: number) {
    const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((i) => i.id === img.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= sorted.length) return;
    try {
      await api.put("/api/admin/properties/images/reorder", {
        image_id: img.id, swap_id: sorted[swap].id,
      });
      fetchImages();
    } catch { toast.error("Failed to reorder"); }
  }

  const filtered = selectedProp ? properties : properties.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Property Gallery</h1>
        <p className="text-sm text-muted-foreground">Manage property images</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search property..."
            className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none" />
        </div>
        {!selectedProp && (
          <div className="flex-1 max-w-md">
            <select value="" onChange={(e) => setSelectedProp(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none">
              <option value="">Select a property...</option>
              {filtered.slice(0, 100).map((p) => (
                <option key={p.id} value={p.id}>#{p.id} — {p.title.slice(0, 60)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedProp && (
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Property #{selectedProp}</span>
              <button onClick={() => { setSelectedProp(""); setImages([]); }}
                className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary">
                Change
              </button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Images"}
              <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : selectedProp ? (
        images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">No images yet. Upload some!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[...images].sort((a, b) => a.sort_order - b.sort_order).map((img) => (
              <div key={img.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-[4/3] overflow-hidden bg-secondary/30">
                  <img src={img.file_path} alt={img.file_name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                </div>
                {img.is_primary && (
                  <div className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-medium text-white">
                    Primary
                  </div>
                )}
                <div className="absolute inset-0 flex items-end justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  {!img.is_primary && (
                    <button onClick={() => setPrimary(img)} title="Set as primary"
                      className="rounded-lg bg-white/20 px-2 py-1 text-xs font-medium text-white backdrop-blur hover:bg-white/30">
                      <Star className="h-3 w-3" />
                    </button>
                  )}
                  <button onClick={() => reorder(img, -1)} disabled={images.findIndex((i) => i.id === img.id) === 0}
                    className="rounded-lg bg-white/20 px-2 py-1 text-xs font-medium text-white backdrop-blur hover:bg-white/30 disabled:opacity-30">
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button onClick={() => reorder(img, 1)} disabled={images.findIndex((i) => i.id === img.id) === images.length - 1}
                    className="rounded-lg bg-white/20 px-2 py-1 text-xs font-medium text-white backdrop-blur hover:bg-white/30 disabled:opacity-30">
                    <ArrowDown className="h-3 w-3" />
                  </button>
                  <button onClick={() => deleteImage(img)} title="Delete"
                    className="rounded-lg bg-red-500/60 px-2 py-1 text-xs font-medium text-white backdrop-blur hover:bg-red-500/80">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="px-2 py-1.5 text-[10px] text-muted-foreground truncate">{img.file_name}</div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">Select a property to manage its gallery</p>
        </div>
      )}
    </div>
  );
}
