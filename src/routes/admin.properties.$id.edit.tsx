/**
 * Admin edit-property route. Loads an existing property by ID and presents
 * a single-page form for all editable fields.
 */
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { Loader2, ChevronLeft } from "lucide-react";
import { MediaField } from "@/components/media-field";

export const Route = createFileRoute("/admin/properties/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Property — Admin — AVR Homes" }] }),
  component: AdminEditProperty,
});

const PROPERTY_TYPES = [
  ["apartment", "Apartment"], ["villa", "Villa"], ["townhouse", "Townhouse"],
  ["penthouse", "Penthouse"], ["studio", "Studio"], ["land", "Land"], ["commercial", "Commercial"],
];
const PURPOSES = [
  ["buy", "For Sale"], ["rent", "For Rent"], ["shortlet", "Short-Let"],
];
const AMENITIES = ["Pool", "Gym", "Parking", "Security", "CCTV", "Generator", "AC", "Furnished", "Balcony", "Garden", "Staff Quarters", "Smart Home"];

const STATUS_OPTIONS = [
  ["published", "Published"], ["draft", "Draft"], ["archived", "Archived"],
];

/** Shape of the property data returned by the API and used in the edit form. */
interface PropertyData {
  title: string; description: string; type: string; purpose: string; price: number;
  beds: number; baths: number; area: number; amenities: string[];
  city: string; community: string; address: string; lat: string; lng: string;
  image: string | null; video_url: string; virtual_tour_url: string; floor_plan_url: string;
  is_active: number; featured: boolean; is_verified: boolean;
}

/** Single-page property editor. Loads existing data, allows editing all fields, and saves via PUT. */
function AdminEditProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams({ from: "/admin/properties/$id/edit" });
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState<PropertyData>({
    title: "", description: "", type: "apartment", purpose: "buy", price: 0,
    beds: 0, baths: 0, area: 0, amenities: [],
    city: "", community: "", address: "", lat: "", lng: "",
    image: null, video_url: "", virtual_tour_url: "", floor_plan_url: "",
    is_active: 1, featured: false, is_verified: false,
  });

  /* Load property data on mount / id change */
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ property: PropertyData }>(`/api/admin/properties/${id}`);
        const p = res.data.property;
        setForm({
          title: p.title || "", description: p.description || "", type: p.type || "apartment",
          purpose: p.purpose || "buy", price: p.price || 0,
          beds: p.beds || 0, baths: p.baths || 0, area: p.area || 0,
          amenities: Array.isArray(p.amenities) ? p.amenities : [],
          city: p.city || "", community: p.community || "", address: p.address || "",
          lat: String(p.lat ?? ""), lng: String(p.lng ?? ""),
          image: p.image || null, video_url: p.video_url || "",
          virtual_tour_url: p.virtual_tour_url || "", floor_plan_url: p.floor_plan_url || "",
          is_active: p.is_active, featured: p.featured, is_verified: p.is_verified,
        });
      } catch (err) {
        setFetchError(err instanceof ApiError ? err.message : "Failed to load property");
        toast.error("Failed to load property");
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  /** Update a single form field. */
  function update<K extends keyof PropertyData>(field: K, value: PropertyData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
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

  /** Save changes — strips non-editable fields (featured, verified, is_active) before sending. */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { featured, is_verified, is_active, ...payload }: any = form;
      const status = is_active === 1 ? "published" : is_active === 2 ? "archived" : "draft";
      payload.status = status;
      await api.put(`/api/admin/properties/${id}`, payload);
      toast.success("Property updated successfully");
      navigate({ to: "/admin/properties" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update property");
      toast.error("Failed to update property");
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (fetchError) {
    return <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{fetchError}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate({ to: "/admin/properties" })} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold">Edit Property</h1>
          <p className="text-sm text-muted-foreground">#{id}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">Basic Info</h3>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} />
          </div>
          <div className="grid grid-cols-3 gap-4">
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
            <div>
              <Label>Status</Label>
              <Select value={form.is_active === 1 ? "published" : form.is_active === 2 ? "archived" : "draft"} onValueChange={(v) => update("is_active", v === "published" ? 1 : v === "archived" ? 2 : 0)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="price">Price (NGN)</Label>
            <Input id="price" type="number" value={form.price} onChange={(e) => update("price", Number(e.target.value))} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">Details</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="beds">Bedrooms</Label>
              <Input id="beds" type="number" min="0" value={form.beds} onChange={(e) => update("beds", Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="baths">Bathrooms</Label>
              <Input id="baths" type="number" min="0" value={form.baths} onChange={(e) => update("baths", Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="area">Area (sqm)</Label>
              <Input id="area" type="number" min="0" value={form.area} onChange={(e) => update("area", Number(e.target.value))} />
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

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">Location</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="community">Community</Label>
              <Input id="community" value={form.community} onChange={(e) => update("community", e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lat">Latitude</Label>
              <Input id="lat" value={form.lat} onChange={(e) => update("lat", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="lng">Longitude</Label>
              <Input id="lng" value={form.lng} onChange={(e) => update("lng", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h3 className="font-display text-lg font-semibold">Media</h3>
          <MediaField
            label="Featured Image"
            value={form.image || ""}
            onChange={(v) => update("image", v)}
            mediaType="image"
            accept="image/*"
            folder="avr-homes/properties"
            placeholder="Upload or paste image URL"
          />
          <MediaField
            label="Video Tour"
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
            <Input id="virtual_tour_url" value={form.virtual_tour_url} onChange={(e) => update("virtual_tour_url", e.target.value)} placeholder="Matterport, Kuula, or 3D tour link" />
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

        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="flex items-center gap-3 border-t border-border pt-6">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/properties" })}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
