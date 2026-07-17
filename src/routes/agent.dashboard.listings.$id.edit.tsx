/**
 * Edit listing route — loads an existing property by ID and provides
 * a multi-step form to update its fields (basic info, details, location, review).
 */

import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, ChevronLeft, ChevronRight, Check, X, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { MediaField } from "@/components/media-field";
import { LocationPicker } from "@/components/location-picker";

export const Route = createFileRoute("/agent/dashboard/listings/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Listing — AVR Homes" }] }),
  component: EditListingPage,
});

const STEPS = ["Basic Info", "Details", "Location", "Review"];
const AMENITIES = ["Pool", "Gym", "Parking", "Security", "CCTV", "Generator", "AC", "Furnished", "Balcony", "Garden", "Staff Quarters", "Smart Home"];

/** Form state for editing an existing listing. */
interface EditForm {
  title: string; description: string; type: string; purpose: string; price: string;
  beds: string; baths: string; area: string; amenities: string[];
  city: string; community: string; address: string; lat: string; lng: string;
  image: string | null; video_url: string; virtual_tour_url: string; floor_plan_url: string;
  is_off_plan: boolean; completion_date: string | null;
}

/** Edit listing page component — loads listing data and renders a multi-step edit form. */
function EditListingPage() {
  const { id } = useParams({ from: "/agent/dashboard/listings/$id/edit" });
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<EditForm>({
    title: "", description: "", type: "apartment", purpose: "buy", price: "",
    beds: "0", baths: "0", area: "0", amenities: [],
    city: "", community: "", address: "", lat: "", lng: "",
    video_url: "", virtual_tour_url: "", floor_plan_url: "",
    image: null, is_off_plan: false, completion_date: null,
  });

  const [existingImages, setExistingImages] = useState<{ id: number; file_path: string; is_primary: boolean }[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [existingVideos, setExistingVideos] = useState<{ id: number; url: string; file_name?: string }[]>([]);
  const [newVideoFiles, setNewVideoFiles] = useState<File[]>([]);

  useEffect(() => {
    api.get<any>(`/api/agent/listings/${id}`)
      .then((res) => {
        const p = res.data;
        setForm({
          title: p.title || "",
          description: p.description || "",
          type: p.type || "apartment",
          purpose: p.purpose || "buy",
          price: String(p.price || ""),
          beds: String(p.beds || "0"),
          baths: String(p.baths || "0"),
          area: String(p.area || "0"),
          amenities: Array.isArray(p.amenities) ? p.amenities : [],
          city: p.city || "",
          community: p.community || "",
          address: p.address || "",
          lat: p.lat ? String(p.lat) : "",
          lng: p.lng ? String(p.lng) : "",
          video_url: p.video_url || "",
          virtual_tour_url: p.virtual_tour_url || "",
          floor_plan_url: p.floor_plan_url || "",
          image: p.image || null,
          is_off_plan: p.is_off_plan || false,
          completion_date: p.completion_date || null,
        });
        if (Array.isArray(p.images)) setExistingImages(p.images);
        if (Array.isArray(p.videos)) setExistingVideos(p.videos);
      })
      .catch(() => navigate({ to: "/agent/dashboard/listings" }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  /** Update a single form field. */
  function update<K extends keyof EditForm>(field: K, value: EditForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /** Toggle an amenity on/off in the edit form. */
  function toggleAmenity(a: string) {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a) ? prev.amenities.filter((x) => x !== a) : [...prev.amenities, a],
    }));
  }

  async function deleteImage(imageId: number) {
    try {
      await api.delete(`/api/upload/${imageId}`);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success("Image removed");
    } catch { toast.error("Failed to delete image"); }
  }

  async function deleteVideo(videoId: number) {
    try {
      await api.delete(`/api/upload/video/${videoId}`);
      setExistingVideos((prev) => prev.filter((v) => v.id !== videoId));
      toast.success("Video removed");
    } catch {
      toast.error("Failed to delete video");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api.put(`/api/agent/listings/${id}`, {
        ...form,
        price: Number(form.price),
        beds: Number(form.beds),
        baths: Number(form.baths),
        area: Number(form.area),
        lat: form.lat ? Number(form.lat) : 6.45,
        lng: form.lng ? Number(form.lng) : 3.42,
        image: form.image || null,
        video_url: form.video_url || null,
        virtual_tour_url: form.virtual_tour_url || null,
        floor_plan_url: form.floor_plan_url || null,
        completion_date: form.completion_date || null,
      });
      // Upload new gallery images after save
      if (newImageFiles.length > 0) {
        const imgFd = new FormData();
        for (const img of newImageFiles) imgFd.append("files", img);
        imgFd.append("property_id", String(id));
        try { await api.post("/api/upload/gallery", imgFd); } catch { /* non-blocking */ }
      }

      // Upload new videos after save
      if (newVideoFiles.length > 0) {
        const videoFd = new FormData();
        for (const v of newVideoFiles) {
          videoFd.append("files", v);
        }
        videoFd.append("property_id", String(id));
        try {
          await api.post("/api/upload/video-gallery", videoFd);
          toast.success("Video(s) uploaded");
        } catch { /* non-blocking */ }
      }

      toast.success("Listing updated");
      navigate({ to: "/agent/dashboard/listings" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save";
      toast.error(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Edit Listing</h1>
          <p className="text-sm text-muted-foreground">{form.title}</p>
        </div>

        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                i < step ? "bg-primary text-primary-foreground" :
                i === step ? "border-2 border-primary text-primary" :
                "border border-input text-muted-foreground"
              }`}>{i < step ? <Check className="h-4 w-4" /> : i + 1}</div>
              {i < STEPS.length - 1 && <div className={`h-px w-8 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={form.type} onValueChange={(v) => update("type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[["apartment","Apartment"],["villa","Villa"],["townhouse","Townhouse"],["penthouse","Penthouse"],["studio","Studio"]].map(([v,l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Purpose</label>
                  <Select value={form.purpose} onValueChange={(v) => update("purpose", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="rent">Rent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price (NGN)</label>
                  <Input type="number" value={form.price} onChange={(e) => update("price", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {(["beds", "baths", "area"] as const).map((f) => (
                  <div key={f} className="space-y-2">
                    <label className="text-sm font-medium">{f === "area" ? "Area (sq m)" : f.charAt(0).toUpperCase() + f.slice(1)}</label>
                    <Input type="number" value={form[f]} onChange={(e) => update(f, e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map((a) => (
                    <button key={a} type="button" onClick={() => toggleAmenity(a)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        form.amenities.includes(a) ? "bg-primary text-primary-foreground" : "border border-input hover:bg-accent"
                      }`}>
                      {form.amenities.includes(a) && <Check className="h-3 w-3" />}{a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Community</label>
                  <Input value={form.community} onChange={(e) => update("community", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location on Map</label>
                  <LocationPicker
                    lat={form.lat}
                    lng={form.lng}
                    area={Number(form.area) || 0}
                    propertyType={form.type}
                    address={form.address}
                    city={form.city}
                    community={form.community}
                    onLatChange={(v) => update("lat", v)}
                    onLngChange={(v) => update("lng", v)}
                  />
                </div>
                <div className="mt-6 space-y-4 border-t border-border pt-6">
                  <h3 className="text-sm font-medium text-muted-foreground">Media</h3>
                  <MediaField
                    label="Main Image"
                    value={form.image || ""}
                    onChange={(url) => update("image", url)}
                    mediaType="image"
                    accept="image/png,image/jpeg,image/webp"
                    folder="avr-homes/images"
                    placeholder="Upload main property image"
                  />
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Image Gallery</label>
                    {existingImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {existingImages.filter((img) => !img.is_primary).map((img) => (
                          <div key={img.id} className="group relative">
                            <img src={img.file_path} alt="" className="h-20 w-24 rounded-lg object-cover" />
                            <button type="button" onClick={() => deleteImage(img.id)}
                              className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {newImageFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {newImageFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs">
                            <span className="truncate max-w-[120px]">{f.name}</span>
                            <button type="button" onClick={() => setNewImageFiles((p) => p.filter((_, j) => j !== i))}>
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-4">
                      <p className="text-xs text-muted-foreground mb-2">Add more images (saved after update)</p>
                      <input type="file" accept="image/*" multiple onChange={(e) => {
                        const files = e.target.files;
                        if (files) setNewImageFiles((p) => [...p, ...Array.from(files)]);
                        e.target.value = "";
                      }} className="hidden" id="edit-image-upload" />
                      <label htmlFor="edit-image-upload" className="cursor-pointer rounded-full border border-input px-4 py-1.5 text-sm hover:bg-accent">
                        <Upload className="mr-1 inline h-3.5 w-3.5" />Select images
                      </label>
                    </div>
                  </div>
                  <MediaField
                    label="Video Walkthrough"
                    value={form.video_url}
                    onChange={(url) => update("video_url", url)}
                    mediaType="video"
                    accept="video/*"
                    folder="avr-homes/videos"
                    placeholder="Upload a video walkthrough"
                  />
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Video Gallery</label>
                    {existingVideos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {existingVideos.map((v) => (
                          <div key={v.id} className="group relative">
                            <video src={v.url} className="h-20 w-28 rounded-lg object-cover" />
                            <button type="button" onClick={() => deleteVideo(v.id)}
                              className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {newVideoFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {newVideoFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs">
                            <span className="truncate max-w-[120px]">{f.name}</span>
                            <button type="button" onClick={() => setNewVideoFiles((p) => p.filter((_, j) => j !== i))}>
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-4">
                      <p className="text-xs text-muted-foreground mb-2">Add more video files (saved after update)</p>
                      <input type="file" accept="video/*" multiple onChange={(e) => {
                        const files = e.target.files;
                        if (files) setNewVideoFiles((p) => [...p, ...Array.from(files)]);
                        e.target.value = "";
                      }} className="hidden" id="edit-video-upload" />
                      <label htmlFor="edit-video-upload" className="cursor-pointer rounded-full border border-input px-4 py-1.5 text-sm hover:bg-accent">
                        Select videos
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Virtual Tour URL</label>
                    <Input type="url" value={form.virtual_tour_url} onChange={(e) => update("virtual_tour_url", e.target.value)}
                      placeholder="https://my.matterport.com/show/..." />
                  </div>
                  <MediaField
                    label="Floor Plan"
                    value={form.floor_plan_url}
                    onChange={(url) => update("floor_plan_url", url)}
                    mediaType="document"
                    accept="image/*,.pdf"
                    folder="avr-homes/floorplans"
                    placeholder="Upload a floor plan"
                  />
                </div>
              </div>
            )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-accent/50 p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Title:</span><span className="font-medium">{form.title}</span>
                  <span className="text-muted-foreground">Price:</span><span className="font-medium">₦{Number(form.price).toLocaleString()}</span>
                  <span className="text-muted-foreground">Beds/Baths:</span><span className="font-medium">{form.beds}/{form.baths}</span>
                  <span className="text-muted-foreground">Location:</span><span className="font-medium">{form.city}, {form.community}</span>
                  {form.video_url && <><span className="text-muted-foreground">Video:</span><span className="font-medium truncate">Yes</span></>}
                  {form.virtual_tour_url && <><span className="text-muted-foreground">Virtual Tour:</span><span className="font-medium truncate">Yes</span></>}
                  {form.floor_plan_url && <><span className="text-muted-foreground">Floor Plan:</span><span className="font-medium truncate">Yes</span></>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_off_plan} onCheckedChange={(v) => update("is_off_plan", v)} />
                <Label>Off-plan development</Label>
              </div>
              {form.is_off_plan && (
                <div>
                  <Label htmlFor="completion_date">Est. Completion Date</Label>
                  <Input id="completion_date" type="date" value={form.completion_date || ""} onChange={(e) => update("completion_date", e.target.value || null)} />
                </div>
              )}
            </div>
          )}

          {error && <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <div className="mt-6 flex items-center justify-between">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="rounded-full">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            ) : <div />}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} className="rounded-full">
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving} className="rounded-full">
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
