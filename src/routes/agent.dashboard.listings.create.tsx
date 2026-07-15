/**
 * Create listing route — multi-step form wizard that collects basic info,
 * details, location, media, and a final review before saving as draft or publishing.
 */

import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Check, Upload } from "lucide-react";
import { MediaField } from "@/components/media-field";

export const Route = createFileRoute("/agent/dashboard/listings/create")({
  head: () => ({ meta: [{ title: "Add Listing — AVR Homes" }] }),
  component: CreateListingPage,
});

const STEPS = ["Basic Info", "Details", "Location", "Media", "Review"];

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
  image: File | null; video_url: string; virtual_tour_url: string; floor_plan_url: string; status: string;
}

/** Create listing page component — multi-step form for adding a new property. */
function CreateListingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [form, setForm] = useState<ListingForm>({
    title: "", description: "", type: "apartment", purpose: "buy", price: "",
    beds: "0", baths: "0", area: "0", amenities: [],
    city: "", community: "", address: "", lat: "", lng: "",
    image: null, video_url: "", virtual_tour_url: "", floor_plan_url: "", status: "draft",
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

  /** Handle file selection for the main property image and show a preview. */
  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
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
      const payload: Record<string, any> = {
        ...form,
        price: Number(form.price),
        beds: Number(form.beds),
        baths: Number(form.baths),
        area: Number(form.area),
        lat: form.lat ? Number(form.lat) : 6.45,
        lng: form.lng ? Number(form.lng) : 3.42,
        status: publish ? "published" : "draft",
        image: null,
      };
      delete payload.image;

      const res = await api.post<{ id: number }>("/api/agent/listings", payload);

      // Upload image if selected
      if (form.image && res.data?.id) {
        const imgData = new FormData();
        imgData.append("image", form.image);
        imgData.append("property_id", String(res.data.id));
        await api.post("/api/upload", imgData).catch(() => {});
      }

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
                <Label>Main Image</Label>
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg object-cover" />
                      <button type="button" onClick={() => { setForm((p) => ({ ...p, image: null })); setImagePreview(null); }}
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white text-xs">✕</button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mb-2 h-8 w-8 text-muted-foreground/60" />
                      <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG or WebP (max 10MB)</p>
                    </>
                  )}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} className="hidden" id="image-upload" />
                  <label htmlFor="image-upload" className="mt-3 cursor-pointer rounded-full border border-input px-4 py-1.5 text-sm hover:bg-accent">
                    {imagePreview ? "Change image" : "Select image"}
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
                  {form.video_url && <> <span className="text-muted-foreground">Video:</span><span className="font-medium truncate">Yes</span> </>}
                  {form.virtual_tour_url && <> <span className="text-muted-foreground">Virtual Tour:</span><span className="font-medium truncate">Yes</span> </>}
                  {form.floor_plan_url && <> <span className="text-muted-foreground">Floor Plan:</span><span className="font-medium truncate">Yes</span> </>}
                </div>
              </div>
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
