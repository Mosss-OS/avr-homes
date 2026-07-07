import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { Loader2, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/admin/agents/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Agent — Admin — AVR Homes" }] }),
  component: AdminEditAgent,
});

interface AgentData {
  name: string; email: string; phone: string; agency: string; bio: string;
  whatsapp: string; experience: string; state: string; city: string;
  avg_monthly_listings: number; avg_deal_size: number; referral_source: string;
  social_instagram: string; social_facebook: string; social_linkedin: string;
  social_tiktok: string; social_youtube: string;
  property_types: string[]; specialization: string[]; languages: string[]; support_needed: string[];
}

function AdminEditAgent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams({ from: "/admin/agents/$id/edit" });
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState<AgentData>({
    name: "", email: "", phone: "", agency: "", bio: "",
    whatsapp: "", experience: "", state: "", city: "",
    avg_monthly_listings: 0, avg_deal_size: 0, referral_source: "",
    social_instagram: "", social_facebook: "", social_linkedin: "",
    social_tiktok: "", social_youtube: "",
    property_types: [], specialization: [], languages: [], support_needed: [],
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ agent: AgentData }>(`/api/admin/agents/${id}`);
        const a = res.data.agent;
        setForm({
          name: a.name || "", email: a.email || "", phone: a.phone || "",
          agency: a.agency || "", bio: a.bio || "",
          whatsapp: a.whatsapp || "", experience: a.experience || "",
          state: a.state || "", city: a.city || "",
          avg_monthly_listings: a.avg_monthly_listings || 0,
          avg_deal_size: a.avg_deal_size || 0,
          referral_source: a.referral_source || "",
          social_instagram: a.social_instagram || "",
          social_facebook: a.social_facebook || "",
          social_linkedin: a.social_linkedin || "",
          social_tiktok: a.social_tiktok || "",
          social_youtube: a.social_youtube || "",
          property_types: Array.isArray(a.property_types) ? a.property_types : [],
          specialization: Array.isArray(a.specialization) ? a.specialization : [],
          languages: Array.isArray(a.languages) ? a.languages : [],
          support_needed: Array.isArray(a.support_needed) ? a.support_needed : [],
        });
      } catch (err) {
        setFetchError(err instanceof ApiError ? err.message : "Failed to load agent");
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  function update<K extends keyof AgentData>(field: K, value: AgentData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.put(`/api/admin/agents/${id}`, form);
      navigate({ to: "/admin/agents" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update agent");
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
        <button onClick={() => navigate({ to: "/admin/agents" })} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold">Edit Agent</h1>
          <p className="text-sm text-muted-foreground">#{id}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">Basic Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="agency">Agency</Label>
              <Input id="agency" value={form.agency} onChange={(e) => update("agency", e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={form.bio} onChange={(e) => update("bio", e.target.value)} rows={3} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">Contact & Location</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="experience">Experience</Label>
              <Input id="experience" value={form.experience} onChange={(e) => update("experience", e.target.value)} placeholder="e.g. 5 years" />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} onChange={(e) => update("state", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">Performance</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="avg_monthly_listings">Avg Monthly Listings</Label>
              <Input id="avg_monthly_listings" type="number" min="0" value={form.avg_monthly_listings} onChange={(e) => update("avg_monthly_listings", Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="avg_deal_size">Avg Deal Size (NGN)</Label>
              <Input id="avg_deal_size" type="number" min="0" value={form.avg_deal_size} onChange={(e) => update("avg_deal_size", Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">Social Media</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Instagram</Label><Input value={form.social_instagram} onChange={(e) => update("social_instagram", e.target.value)} /></div>
            <div><Label>Facebook</Label><Input value={form.social_facebook} onChange={(e) => update("social_facebook", e.target.value)} /></div>
            <div><Label>LinkedIn</Label><Input value={form.social_linkedin} onChange={(e) => update("social_linkedin", e.target.value)} /></div>
            <div><Label>TikTok</Label><Input value={form.social_tiktok} onChange={(e) => update("social_tiktok", e.target.value)} /></div>
            <div><Label>YouTube</Label><Input value={form.social_youtube} onChange={(e) => update("social_youtube", e.target.value)} /></div>
          </div>
        </div>

        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="flex items-center gap-3 border-t border-border pt-6">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/agents" })}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
