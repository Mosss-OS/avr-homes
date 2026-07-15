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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { MediaField } from "@/components/media-field";

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
    image: null,
  });

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
        });
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

  /** Save changes to the API, then navigate back to the listings index. */
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
      });
      navigate({ to: "/agent/dashboard/listings" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Latitude</label>
                    <Input type="number" step="any" value={form.lat} onChange={(e) => update("lat", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Longitude</label>
                    <Input type="number" step="any" value={form.lng} onChange={(e) => update("lng", e.target.value)} />
                  </div>
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
