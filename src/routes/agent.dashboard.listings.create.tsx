/**
 * Create listing route — multi-step form wizard that collects basic info,
 * details, location, media, and a final review before saving as draft or publishing.
 */

import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, ChevronLeft, ChevronRight, Check, Upload, X } from "lucide-react";
import { MediaField } from "@/components/media-field";

export const Route = createFileRoute("/agent/dashboard/listings/create")({
  head: () => ({ meta: [{ title: "Add Listing — AVR Homes" }] }),
  component: CreateListingPage,
});

const STEPS = ["Basic Info", "Details", "Location", "Media", "Review"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];

const PROPERTY_TYPES = [
  ["apartment", "Apartment"], ["villa", "Villa"], ["townhouse", "Townhouse"],
  ["penthouse", "Penthouse"], ["studio", "Studio"],
];
const AMENITIES = ["Pool", "Gym", "Parking", "Security", "CCTV", "Generator", "AC", "Furnished", "Balcony", "Garden", "Staff Quarters", "Smart Home"];

/** Form state for creating a new property listing. */
interface ListingForm {
  title: string; description: string; type: string; purpose: string; price: string;
  beds: string; baths: string; area: string; amenities: string[];
  city: string; community: string; address: string; lat: string; lng: string;
  images: File[]; videos: File[]; video_url: string; virtual_tour_url: string; floor_plan_url: string;
  is_off_plan: boolean; completion_date: string; status: string;
}

/** Create listing page component — multi-step form for adding a new property. */
function CreateListingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [form, setForm] = useState<ListingForm>({
    title: "", description: "", type: "apartment", purpose: "buy", price: "",
    beds: "0", baths: "0", area: "0", amenities: [],
    city: "", community: "", address: "", lat: "", lng: "",
    images: [], videos: [], video_url: "", virtual_tour_url: "", floor_plan_url: "",
    is_off_plan: false, completion_date: "", status: "draft",
  });

  /** Update a single form field and clear its validation error. */
  function update<K extends keyof ListingForm>(field: K, value: ListingForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  }

  /** Toggle an amenity on/off in the form state. */
  function toggleAmenity(a: string) {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }));
  }

  /** Handle file selection for property images and show previews. */
  function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setForm((prev) => ({ ...prev, images: [...prev.images, ...newFiles] }));
    setImagePreviews((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))]);
  }

  function removeImage(index: number) {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  /** Validate the current step's required fields. Returns true if valid. */
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

  /** Submit the listing: save as draft or publish, then navigate to the listings page. */
  async function handleSubmit(publish: boolean) {
    setLoading(true);
    setError("");
    try {
      const { images, videos, ...rest } = form;
      const payload: Record<string, any> = {
        ...rest,
        price: Number(form.price),
        beds: Number(form.beds),
        baths: Number(form.baths),
        area: Number(form.area),
        lat: form.lat ? Number(form.lat) : 6.45,
        lng: form.lng ? Number(form.lng) : 3.42,
        status: publish ? "published" : "draft",
      };

      const res = await api.post<{ id: number }>("/api/agent/listings", payload);
      const propertyId = res.data?.id;

      // Upload images after property creation
      if (images.length > 0 && propertyId) {
        const loadingId = toast.loading(`Uploading ${images.length} image(s)...`);

        // Upload first image as primary
        const primaryFd = new FormData();
        primaryFd.append("file", images[0]);
        primaryFd.append("property_id", String(propertyId));
        primaryFd.append("is_primary", "1");

        try {
          await api.post("/api/upload", primaryFd);
          toast.success("Main image uploaded", { id: loadingId });
        } catch (uploadErr) {
          const msg = uploadErr instanceof ApiError ? uploadErr.message : "Server rejected the file";
          toast.error(`Main image failed: ${msg}`, { id: loadingId });
        }

        // Upload remaining images as gallery
        if (images.length > 1) {
          const galleryFd = new FormData();
          for (let i = 1; i < images.length; i++) {
            galleryFd.append("files", images[i]);
          }
          galleryFd.append("property_id", String(propertyId));

          try {
            const galleryRes = await api.post<{ uploaded: any[]; errors: string[] }>("/api/upload/gallery", galleryFd);
            const uploaded = galleryRes.data?.uploaded?.length ?? 0;
            const failed = galleryRes.data?.errors?.length ?? 0;
            if (failed > 0) {
              toast.error(`${uploaded} uploaded, ${failed} failed`);
              galleryRes.data.errors.forEach((e) => toast.error(e));
            } else if (uploaded > 0) {
              toast.success(`${uploaded} gallery image(s) uploaded`);
            }
          } catch (galleryErr) {
            const msg = galleryErr instanceof ApiError ? galleryErr.message : "Server rejected the upload";
            toast.error(`Gallery upload failed: ${msg}`);
          }
        }
      }

      // Upload videos after images
      if (videos.length > 0 && propertyId) {
        const videoFd = new FormData();
        const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];
        for (const v of videos) {
          if (allowedVideoTypes.includes(v.type)) {
            videoFd.append("files", v);
          }
        }
        if (videoFd.has("files")) {
          videoFd.append("property_id", String(propertyId));
          const videoLoadingId = toast.loading(`Uploading ${videoFd.getAll("files").length} video(s)...`);
          try {
            const videoRes = await api.post<{ uploaded: any[]; errors: string[] }>("/api/upload/video-gallery", videoFd);
            const uploaded = videoRes.data?.uploaded?.length ?? 0;
            const failed = videoRes.data?.errors?.length ?? 0;
            if (failed > 0 && uploaded > 0) {
              toast.success(`${uploaded} video(s) uploaded, ${failed} failed`, { id: videoLoadingId });
            } else if (uploaded > 0) {
              toast.success(`${uploaded} video(s) uploaded`, { id: videoLoadingId });
            } else if (failed > 0) {
              toast.error(`${failed} video(s) failed`, { id: videoLoadingId });
            } else {
              toast.dismiss(videoLoadingId);
            }
          } catch (videoErr) {
            const msg = videoErr instanceof ApiError ? videoErr.message : "Video upload failed";
            toast.error(msg, { id: videoLoadingId });
          }
        }
      }

      toast.success("Listing created");
      navigate({ to: "/agent/dashboard/listings" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create listing");
    } finally {
      setLoading(false);
    }
  }

  /** Advance to the next step after validating the current one. */
  function nextStep() {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Add New Listing</h1>
          <p className="text-sm text-muted-foreground">Create a new property listing</p>
        </div>

        {/* Steps */}
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
          <h2 className="mb-4 font-semibold">{STEPS[step]}</h2>

          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Luxury Beachfront Villa" />
                {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description *</Label>
                <Textarea id="desc" value={form.description} onChange={(e) => update("description", e.target.value)}
                  placeholder="Describe the property..." rows={4} />
                {fieldErrors.description && <p className="text-xs text-destructive">{fieldErrors.description}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => update("type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Select value={form.purpose} onValueChange={(v) => update("purpose", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="rent">Rent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (NGN) *</Label>
                  <Input id="price" type="number" value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="250000000" />
                  {fieldErrors.price && <p className="text-xs text-destructive">{fieldErrors.price}</p>}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {(["beds", "baths", "area"] as const).map((f) => (
                  <div key={f} className="space-y-2">
                    <Label htmlFor={f}>{f === "area" ? "Area (sq m)" : f.charAt(0).toUpperCase() + f.slice(1)}</Label>
                    <Input id={f} type="number" value={form[f]} onChange={(e) => update(f, e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map((a) => (
                    <button key={a} type="button" onClick={() => toggleAmenity(a)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        form.amenities.includes(a) ? "bg-primary text-primary-foreground" : "border border-input hover:bg-accent"
                      }`}>
                      {form.amenities.includes(a) && <Check className="h-3 w-3" />}
                      {a}
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
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Lagos" />
                  {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="community">Community *</Label>
                  <Input id="community" value={form.community} onChange={(e) => update("community", e.target.value)} placeholder="Lekki Phase 1" />
                  {fieldErrors.community && <p className="text-xs text-destructive">{fieldErrors.community}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Plot 10, Admiralty Way" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input id="lat" type="number" step="any" value={form.lat} onChange={(e) => update("lat", e.target.value)} placeholder="6.45" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input id="lng" type="number" step="any" value={form.lng} onChange={(e) => update("lng", e.target.value)} placeholder="3.42" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label>Property Images (first image = main photo)</Label>
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8">
                  {imagePreviews.length > 0 ? (
                    <div className="flex w-full flex-wrap gap-3">
                      {imagePreviews.map((preview, i) => (
                        <div key={i} className="relative">
                          <img src={preview} alt={`Preview ${i + 1}`} className="h-24 w-32 rounded-lg object-cover" />
                          <button type="button" onClick={() => removeImage(i)}
                            className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground text-xs">
                            <X className="h-3 w-3" />
                          </button>
                          {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-primary/80 px-1.5 py-0.5 text-[10px] text-primary-foreground">Main</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <Upload className="mb-2 h-8 w-8 text-muted-foreground/60" />
                      <p className="text-sm text-muted-foreground">Click to upload images</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG or WebP — first image is the main photo</p>
                    </>
                  )}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImages} className="hidden" id="image-upload" multiple />
                  <label htmlFor="image-upload" className="mt-3 cursor-pointer rounded-full border border-input px-4 py-1.5 text-sm hover:bg-accent">
                    {imagePreviews.length > 0 ? "Add more images" : "Select images"}
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Additional Media</h3>
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
                  <Label>Additional Videos (upload after listing is created)</Label>
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6">
                    {form.videos.length > 0 ? (
                      <div className="flex w-full flex-wrap gap-2">
                        {form.videos.map((v, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs">
                            <span className="truncate max-w-[140px]">{v.name}</span>
                            <button type="button" onClick={() => setForm((p) => ({ ...p, videos: p.videos.filter((_, j) => j !== i) }))}>
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Select MP4, MOV, or WebM files</p>
                    )}
                    <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => {
                      const files = e.target.files;
                      if (files) setForm((p) => ({ ...p, videos: [...p.videos, ...Array.from(files)] }));
                      e.target.value = "";
                    }} className="hidden" id="video-upload" multiple />
                    <label htmlFor="video-upload" className="mt-3 cursor-pointer rounded-full border border-input px-4 py-1.5 text-sm hover:bg-accent">
                      {form.videos.length > 0 ? "Add more videos" : "Select videos"}
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="virtual_tour_url">Virtual Tour URL</Label>
                  <Input id="virtual_tour_url" type="url" value={form.virtual_tour_url}
                    onChange={(e) => update("virtual_tour_url", e.target.value)}
                    placeholder="https://my.matterport.com/show/..." />
                  <p className="text-xs text-muted-foreground">Matterport, Kuula, or any 3D tour link</p>
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

          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-accent/50 p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Title:</span><span className="font-medium">{form.title || "—"}</span>
                  <span className="text-muted-foreground">Price:</span><span className="font-medium">₦{form.price ? Number(form.price).toLocaleString() : "—"}</span>
                  <span className="text-muted-foreground">Type:</span><span className="font-medium capitalize">{form.type}</span>
                  <span className="text-muted-foreground">Purpose:</span><span className="font-medium capitalize">{form.purpose}</span>
                  <span className="text-muted-foreground">Beds/Baths:</span><span className="font-medium">{form.beds} / {form.baths}</span>
                  <span className="text-muted-foreground">Location:</span><span className="font-medium">{form.city}, {form.community}</span>
                  {form.images.length > 0 && <> <span className="text-muted-foreground">Images:</span><span className="font-medium truncate">{form.images.length} file(s)</span> </>}
                  {form.video_url || form.videos.length > 0 ? <><span className="text-muted-foreground">Video{(form.video_url ? 1 : 0) + form.videos.length > 1 ? "s" : ""}:</span><span className="font-medium truncate">{(form.video_url ? 1 : 0) + form.videos.length} file(s)</span></> : null}
                  {form.virtual_tour_url && <> <span className="text-muted-foreground">Virtual Tour:</span><span className="font-medium truncate">Yes</span> </>}
                  {form.floor_plan_url && <> <span className="text-muted-foreground">Floor Plan:</span><span className="font-medium truncate">Yes</span> </>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_off_plan} onCheckedChange={(v) => update("is_off_plan", v)} />
                <Label>Off-plan development</Label>
              </div>
              {form.is_off_plan && (
                <div>
                  <Label htmlFor="completion_date">Est. Completion Date</Label>
                  <Input id="completion_date" type="date" value={form.completion_date} onChange={(e) => update("completion_date", e.target.value)} />
                </div>
              )}
              <p className="text-sm text-muted-foreground">You can save as draft and publish later.</p>
            </div>
          )}

          {error && <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <div className="mt-6 flex items-center justify-between">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} className="rounded-full">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              {step < STEPS.length - 1 ? (
                <Button onClick={nextStep} className="rounded-full">
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button onClick={() => handleSubmit(false)} variant="outline" disabled={loading} className="rounded-full">
                    {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                    Save Draft
                  </Button>
                  <Button onClick={() => handleSubmit(true)} disabled={loading} className="rounded-full">
                    {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                    Publish
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
