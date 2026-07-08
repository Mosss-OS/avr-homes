/**
 * Agent profile settings route — allows the agent to view and update their
 * personal info, professional details, business stats, social links, and community info.
 */

import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Check, Camera, Save } from "lucide-react";

export const Route = createFileRoute("/agent/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile Settings — AVR Homes" }] }),
  component: AgentProfilePage,
});

/** Complete agent profile data returned by the API. */
interface FullAgentProfile {
  id: number;
  slug: string | null;
  photo_url: string | null;
  name: string;
  email: string;
  agency: string;
  phone: string;
  whatsapp: string | null;
  languages: string[];
  avatar_hue: number;
  bio: string | null;
  experience: string | null;
  state: string | null;
  city: string | null;
  lasrera_number: string | null;
  niesv_number: string | null;
  avg_monthly_listings: string | null;
  avg_deal_size: string | null;
  property_types: string[];
  specialization: string[];
  social_instagram: string | null;
  social_facebook: string | null;
  social_linkedin: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
  why_join: string | null;
  referral_source: string | null;
  is_verified: boolean;
}

const PROPERTY_TYPES = ["Apartment", "Villa", "Townhouse", "Penthouse", "Studio", "Land", "Commercial"];
const SPECIALIZATIONS = ["Luxury Homes", "Waterfront", "Investment Advisory", "Property Management", "Commercial Real Estate", "Land Acquisition", "Diaspora Investment"];
const EXPERIENCE_LEVELS = [["1-2", "1-2 years"], ["3-5", "3-5 years"], ["6-10", "6-10 years"], ["10+", "10+ years"]];
const MONTHLY_LISTINGS = [["1-5", "1-5 listings"], ["6-15", "6-15 listings"], ["16-30", "16-30 listings"], ["30+", "30+ listings"]];
const DEAL_SIZES = [["below-10m", "Below ₦10M"], ["10m-50m", "₦10M - ₦50M"], ["50m-200m", "₦50M - ₦200M"], ["200m+", "₦200M+"]];
const LANGUAGE_OPTIONS = ["English", "Igbo", "Yoruba", "Hausa", "Pidgin", "French"];

/** Profile page component — fetches the agent profile and renders editable sections. */
function AgentProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FullAgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    api.get<FullAgentProfile>("/api/agent/profile")
      .then((r) => setProfile(r.data))
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  /** Update a single profile field in local state. */
  function update(field: string, value: string | string[]) {
    setProfile((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  /** Toggle a value in one of the multi-select array fields (property types, specializations, languages). */
  function toggleArray(field: "property_types" | "specialization" | "languages", value: string) {
    setProfile((prev) => {
      if (!prev) return prev;
      const arr = prev[field] as string[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [field]: next };
    });
  }

  /** Persist the full profile to the API and show a success/error toast. */
  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      await api.put("/api/agent/profile", {
        name: profile.name, agency: profile.agency, phone: profile.phone,
        whatsapp: profile.whatsapp, languages: profile.languages,
        bio: profile.bio, experience: profile.experience,
        state: profile.state, city: profile.city,
        lasrera_number: profile.lasrera_number, niesv_number: profile.niesv_number,
        avg_monthly_listings: profile.avg_monthly_listings,
        avg_deal_size: profile.avg_deal_size,
        property_types: profile.property_types, specialization: profile.specialization,
        social_instagram: profile.social_instagram, social_facebook: profile.social_facebook,
        social_linkedin: profile.social_linkedin, social_tiktok: profile.social_tiktok,
        social_youtube: profile.social_youtube,
        why_join: profile.why_join, referral_source: profile.referral_source,
      });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  /** Upload a new avatar image and update the profile photo_url. */
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await api.post<{ photo_url: string }>("/api/agent/profile/avatar", formData);
      setProfile((prev) => prev ? { ...prev, photo_url: res.data.photo_url } : prev);
      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[300px] items-center justify-center">
          <p className="text-muted-foreground">Could not load profile</p>
        </div>
      </DashboardLayout>
    );
  }

  const initials = profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  /** Render a group of toggle-able chip buttons for multi-select fields. */
  function ChipSelect({ items, selected, onToggle, label }: { items: string[]; selected: string[]; onToggle: (v: string) => void; label: string }) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const active = selected.includes(item);
            return (
              <button key={item} type="button" onClick={() => onToggle(item)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "border border-input bg-background hover:bg-accent"
                }`}>
                {active && <Check className="h-3 w-3" />}
                {item}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Profile Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your agent profile and public information</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="rounded-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        {/* Avatar & Basic Info Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.photo_url || undefined} />
                <AvatarFallback className="text-lg font-medium"
                  style={{ backgroundColor: `hsl(${profile.avatar_hue || 195}, 50%, 70%)` }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-accent">
                <Camera className="h-3.5 w-3.5" />
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  onChange={handleAvatarUpload} disabled={avatarUploading} />
              </label>
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">{profile.name}</p>
                {profile.is_verified && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">Verified</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{profile.agency} &middot; {profile.city || "Lagos"}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 font-semibold">Personal Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={profile.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={profile.email} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={profile.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" type="tel" value={profile.whatsapp || ""} onChange={(e) => update("whatsapp", e.target.value)} placeholder="Same as phone if empty" />
            </div>
          </div>
        </div>

        {/* Professional Info */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 font-semibold">Professional Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agency">Agency / Company</Label>
              <Input id="agency" value={profile.agency} onChange={(e) => update("agency", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={profile.state || ""} onChange={(e) => update("state", e.target.value)} placeholder="Lagos" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={profile.city || ""} onChange={(e) => update("city", e.target.value)} placeholder="Lekki" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Experience</Label>
              <Select value={profile.experience || ""} onValueChange={(v) => update("experience", v)}>
                <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea id="bio" value={profile.bio || ""} onChange={(e) => update("bio", e.target.value)}
              placeholder="Tell potential clients about yourself..." rows={3} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lasrera">LASRERA Number</Label>
              <Input id="lasrera" value={profile.lasrera_number || ""} onChange={(e) => update("lasrera_number", e.target.value)} placeholder="LAS/REA/2024/XXXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="niesv">NIESV Number</Label>
              <Input id="niesv" value={profile.niesv_number || ""} onChange={(e) => update("niesv_number", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 font-semibold">Business Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="avg_monthly_listings">Average Monthly Listings</Label>
              <Select value={profile.avg_monthly_listings || ""} onValueChange={(v) => update("avg_monthly_listings", v)}>
                <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                <SelectContent>
                  {MONTHLY_LISTINGS.map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="avg_deal_size">Average Deal Size</Label>
              <Select value={profile.avg_deal_size || ""} onValueChange={(v) => update("avg_deal_size", v)}>
                <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                <SelectContent>
                  {DEAL_SIZES.map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <ChipSelect items={PROPERTY_TYPES} selected={profile.property_types || []} onToggle={(v) => toggleArray("property_types", v)} label="Property Types" />
          </div>
          <div className="mt-4">
            <ChipSelect items={SPECIALIZATIONS} selected={profile.specialization || []} onToggle={(v) => toggleArray("specialization", v)} label="Specializations" />
          </div>
          <div className="mt-4">
            <ChipSelect items={LANGUAGE_OPTIONS} selected={profile.languages || []} onToggle={(v) => toggleArray("languages", v)} label="Languages" />
          </div>
        </div>

        {/* Social Links */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 font-semibold">Social Links</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["social_instagram", "Instagram", "@username"],
              ["social_facebook", "Facebook", "username"],
              ["social_linkedin", "LinkedIn", "username"],
              ["social_tiktok", "TikTok", "@username"],
              ["social_youtube", "YouTube", "channel name"],
            ].map(([field, label, placeholder]) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>{label}</Label>
                <Input id={field} value={(profile as any)[field] || ""}
                  onChange={(e) => update(field, e.target.value)} placeholder={placeholder} />
              </div>
            ))}
          </div>
        </div>

        {/* Community */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 font-semibold">Community</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="why_join">Why did you join AVR Homes?</Label>
              <Textarea id="why_join" value={profile.why_join || ""} onChange={(e) => update("why_join", e.target.value)}
                placeholder="Share your motivation..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referral_source">How did you hear about us?</Label>
              <Input id="referral_source" value={profile.referral_source || ""} onChange={(e) => update("referral_source", e.target.value)}
                placeholder="Friend, social media, Google, etc." />
            </div>
          </div>
        </div>

        {/* Save Button (bottom) */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="rounded-full" size="lg">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
