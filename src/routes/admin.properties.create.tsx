/**
 * Admin create-property route. A multi-step wizard (Basic Info → Details →
 * Location → Media → Review) that submits all data as FormData to the API.
 */
import { useState } from "react";
import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth-context";
import { MediaField } from "@/components/media-field";
import { LocationPicker } from "@/components/location-picker";
import { Loader2, ChevronLeft, ChevronRight, Check, Upload, X } from "lucide-react";

export const Route = createFileRoute("/admin/properties/create")({
  head: () => ({ meta: [{ title: "New Property — Admin — AVR Homes" }] }),
  component: AdminCreateProperty,
});

const STEPS = ["Basic Info", "Details", "Location", "Media", "Review"];

const PROPERTY_TYPES = [
  ["apartment", "Apartment"], ["villa", "Villa"], ["townhouse", "Townhouse"],
  ["penthouse", "Penthouse"], ["studio", "Studio"], ["land", "Land"], ["commercial", "Commercial"],
];
const PURPOSES = [
  ["buy", "For Sale"], ["rent", "For Rent"], ["shortlet", "Short-Let"],
];
const AMENITIES = ["Pool", "Gym", "Parking", "Security", "CCTV", "Generator", "AC", "Furnished", "Balcony", "Garden", "Staff Quarters", "Smart Home"];

/** Shape of the create-property form data before being serialised into FormData. */
interface FormData {
  title: string; description: string; type: string; purpose: string; price: string;
  beds: string; baths: string; area: string; amenities: string[];
  city: string; community: string; address: string; lat: string; lng: string;
  image: File | null; images: File[]; videos: File[]; videoUrls: string[]; video_url: string; virtual_tour_url: string; floor_plan_url: string;
  is_off_plan: boolean; completion_date: string; status: string;
}

/** Multi-step property creation wizard. Manages form state, validation, and submission across 5 steps. */
function AdminCreateProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [form, setForm] = useState<FormData>({
    title: "", description: "", type: "apartment", purpose: "buy", price: "",
    beds: "0", baths: "0", area: "0", amenities: [],
    city: "", community: "", address: "", lat: "", lng: "",
    image: null, images: [], videos: [], videoUrls: [], video_url: "", virtual_tour_url: "", floor_plan_url: "",
    is_off_plan: false, completion_date: "", status: "published",
  });

  /** Update a single form field and clear its validation error. */
  function update<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  }

  /** Add or remove an amenity from the selected list. */
  function toggleAmenity(a: string) {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }));
  }

  /** Store the selected image file and create an object URL for preview. */
  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function handleGalleryImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setForm((prev) => ({ ...prev, images: [...prev.images, ...newFiles] }));
    setImagePreviews((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))]);
  }

  function removeGalleryImage(index: number) {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleVideos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setForm((prev) => ({ ...prev, videos: [...prev.videos, ...Array.from(files)] }));
  }

  function removeVideo(index: number) {
    setForm((prev) => ({ ...prev, videos: prev.videos.filter((_, i) => i !== index) }));
  }

  /** Validate required fields for the current step. Returns true if no errors. */
  function validateStep(): boolean {
    const errors: Record<string, string> = {};
    if (step === 0) {
      if (!form.title.trim()) errors.title = "Title is required";
      if (!form.description.trim()) errors.description = "Description is required";
      if (!form.price || Number(form.price) <= 0) errors.price = "Valid price is required";
    }
    if (step === 2) {
      if (!form.city.trim()) errors.city = "City is required";
      if (!form.community.trim()) errors.community = "Community is required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /** Submit the completed form as multipart FormData to the API. */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep()) return;
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (key === "amenities") fd.append(key, JSON.stringify(val));
        else if (key === "image" && val instanceof File) fd.append(key, val);
        else if (key === "is_off_plan") fd.append(key, val ? "1" : "0");
        else if (key !== "images" && key !== "videos") fd.append(key, String(val));
      });
      const res = await api.post<{ id: number }>("/api/admin/properties", fd);
      const propertyId = res.data?.id;

      if (propertyId) {
        if (form.images.length > 0) {
          const galleryFd = new FormData();
          for (const img of form.images) galleryFd.append("files", img);
          galleryFd.append("property_id", String(propertyId));
          try { await api.post("/api/upload/gallery", galleryFd); } catch { /* non-blocking */ }
        }
        if (form.videos.length > 0) {
          const videoFd = new FormData();
          for (const v of form.videos) videoFd.append("files", v);
          videoFd.append("property_id", String(propertyId));
          try { await api.post("/api/upload/video-gallery", videoFd); } catch { /* non-blocking */ }
        }
        for (const url of form.videoUrls) {
          try { await api.post("/api/upload/video-url", { property_id: propertyId, url }); } catch { /* non-blocking */ }
        }
      }

      toast.success("Property created successfully");
      navigate({ to: "/admin/properties" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create property";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">New Property</h1>
        <p className="text-sm text-muted-foreground">Create a new listing on the platform</p>
      </div>

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">{STEPS[step]}</span>
        </div>
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <div className="hidden sm:flex sm:items-center sm:gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-medium ${
                i < step ? "bg-primary text-primary-foreground" :
                i === step ? "border-2 border-primary text-primary" :
                "border border-border text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`whitespace-nowrap text-xs font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Luxury 4-Bedroom Villa in Lekki" />
              {fieldErrors.title && <p className="mt-1 text-xs text-destructive">{fieldErrors.title}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => update("description", e.target.value)} rows={5} placeholder="Describe the property..." />
              {fieldErrors.description && <p className="mt-1 text-xs text-destructive">{fieldErrors.description}</p>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => update("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Purpose</Label>
                <Select value={form.purpose} onValueChange={(v) => update("purpose", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="price">Price (NGN)</Label>
              <Input id="price" type="number" value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="e.g. 150000000" />
              {fieldErrors.price && <p className="mt-1 text-xs text-destructive">{fieldErrors.price}</p>}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="beds">Bedrooms</Label>
                <Input id="beds" type="number" min="0" value={form.beds} onChange={(e) => update("beds", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="baths">Bathrooms</Label>
                <Input id="baths" type="number" min="0" value={form.baths} onChange={(e) => update("baths", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="area">Area (sqm)</Label>
                <Input id="area" type="number" min="0" value={form.area} onChange={(e) => update("area", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Amenities</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {AMENITIES.map((a) => (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                      form.amenities.includes(a)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary"
                    }`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="e.g. Lekki" />
                {fieldErrors.city && <p className="mt-1 text-xs text-destructive">{fieldErrors.city}</p>}
              </div>
              <div>
                <Label htmlFor="community">Community / Area</Label>
                <Input id="community" value={form.community} onChange={(e) => update("community", e.target.value)} placeholder="e.g. Admiralty Way" />
                {fieldErrors.community && <p className="mt-1 text-xs text-destructive">{fieldErrors.community}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Full street address" />
            </div>
            <div>
              <Label>Location on Map</Label>
              <div className="mt-1">
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
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <Label>Featured Image</Label>
              <div className="mt-1">
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="h-40 w-60 rounded-xl object-cover" />
                    <button type="button" onClick={() => { setImagePreview(null); setForm((p) => ({ ...p, image: null })); }}
                      className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background p-8 text-center hover:border-primary">
                    <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload image</span>
                    <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                  </label>
                )}
              </div>
            </div>
            <div>
              <Label>Gallery Images</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="group relative">
                    <img src={preview} alt="" className="h-20 w-24 rounded-lg object-cover" />
                    <button type="button" onClick={() => removeGalleryImage(i)}
                      className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-3 text-sm text-muted-foreground hover:border-primary">
                <Upload className="h-4 w-4" />
                Add more images
                <input type="file" accept="image/*" multiple onChange={handleGalleryImages} className="hidden" />
              </label>
            </div>
            <div>
              <Label>Video Gallery</Label>
              {form.videos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.videos.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs">
                      <span className="truncate max-w-[160px]">{f.name}</span>
                      <button type="button" onClick={() => removeVideo(i)}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Paste video URL (YouTube, Vimeo, MP4...)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        setForm((p) => ({ ...p, videoUrls: [...p.videoUrls, val] }));
                        (e.target as HTMLInputElement).value = "";
                      }
                    }
                  }}
                />
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 text-sm text-muted-foreground hover:border-primary shrink-0">
                  <Upload className="h-4 w-4" />
                  File
                  <input type="file" accept="video/*" multiple onChange={handleVideos} className="hidden" />
                </label>
              </div>
              {form.videoUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.videoUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs">
                      <span className="truncate max-w-[200px]">{url}</span>
                      <button type="button" onClick={() => setForm((p) => ({ ...p, videoUrls: p.videoUrls.filter((_, j) => j !== i) }))}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <MediaField
              label="Video Tour URL"
              value={form.video_url}
              onChange={(v) => update("video_url", v)}
              mediaType="video"
              accept="video/*"
              folder="avr-homes/videos"
              placeholder="YouTube or Vimeo link, or upload a video file"
              helpText="MP4, WebM, or paste a YouTube/Vimeo URL"
            />
            <div>
              <Label htmlFor="virtual_tour_url">Virtual Tour URL</Label>
              <Input id="virtual_tour_url" value={form.virtual_tour_url} onChange={(e) => update("virtual_tour_url", e.target.value)} placeholder="3D tour link (Matterport, Kuula)" />
            </div>
            <MediaField
              label="Floor Plan"
              value={form.floor_plan_url}
              onChange={(v) => update("floor_plan_url", v)}
              mediaType="document"
              accept="image/*,.pdf"
              folder="avr-homes/floorplans"
              placeholder="Upload floor plan or paste URL"
              helpText="PNG, JPG, PDF"
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-semibold">{form.title || "Untitled Property"}</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{form.type}</span></div>
                <div><span className="text-muted-foreground">Purpose:</span> <span className="font-medium capitalize">{form.purpose}</span></div>
                <div><span className="text-muted-foreground">Price:</span> <span className="font-medium">₦{Number(form.price).toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Area:</span> <span className="font-medium">{form.area} sqm</span></div>
                <div><span className="text-muted-foreground">Beds / Baths:</span> <span className="font-medium">{form.beds} / {form.baths}</span></div>
                <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{form.community}, {form.city}</span></div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-muted-foreground">Status: </span>
                <Select value={form.status} onValueChange={(v) => update("status", v)}>
                  <SelectTrigger className="inline-flex w-auto"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Switch checked={form.is_off_plan} onCheckedChange={(v) => update("is_off_plan", v)} />
                <Label>Off-plan development</Label>
              </div>
              {form.is_off_plan && (
                <div className="mt-2">
                  <Label htmlFor="completion_date">Est. Completion Date</Label>
                  <Input id="completion_date" type="date" value={form.completion_date} onChange={(e) => update("completion_date", e.target.value)} />
                </div>
              )}
            </div>
            {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/properties" })} className="w-full sm:w-auto">Cancel</Button>
          <div className="flex gap-3">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="flex-1 sm:flex-none">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={() => { if (validateStep()) setStep(step + 1); }} className="flex-1 sm:flex-none">
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Property
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
