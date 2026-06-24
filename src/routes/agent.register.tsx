import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import type { RegisterPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight, Check, X } from "lucide-react";

export const Route = createFileRoute("/agent/register")({
  head: () => ({
    meta: [
      { title: "Agent Registration — AVR Homes" },
      { name: "description", content: "Join AVR Homes as a verified real estate agent in Lagos." },
    ],
  }),
  component: AgentRegisterPage,
});

const STEPS = ["Personal Info", "Professional", "Business", "Social", "Community"];

const PROPERTY_TYPES = ["Apartment", "Villa", "Townhouse", "Penthouse", "Studio", "Land", "Commercial"];
const SPECIALIZATIONS = ["Luxury Homes", "Waterfront", "Investment Advisory", "Property Management", "Commercial Real Estate", "Land Acquisition", "Diaspora Investment"];
const EXPERIENCE_LEVELS = [["1-2", "1-2 years"], ["3-5", "3-5 years"], ["6-10", "6-10 years"], ["10+", "10+ years"]];
const MONTHLY_LISTINGS = [["1-5", "1-5 listings"], ["6-15", "6-15 listings"], ["16-30", "16-30 listings"], ["30+", "30+ listings"]];
const DEAL_SIZES = [["below-10m", "Below ₦10M"], ["10m-50m", "₦10M - ₦50M"], ["50m-200m", "₦50M - ₦200M"], ["200m+", "₦200M+"]];

function AgentRegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<RegisterPayload>({
    name: "", email: "", password: "", phone: "", agency: "AVR Homes",
    whatsapp: "", city: "", state: "", bio: "", experience: "", lasrera_number: "",
    niesv_number: "", avg_monthly_listings: "", avg_deal_size: "",
    property_types: [], specialization: [],
    social_instagram: "", social_facebook: "", social_linkedin: "", social_tiktok: "", social_youtube: "",
    why_join: "", referral_source: "",
  });

  const [agreeTerms, setAgreeTerms] = useState(false);

  function update(field: keyof RegisterPayload, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function toggleArray(field: "property_types" | "specialization", value: string) {
    setForm((prev) => {
      const arr = prev[field] as string[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [field]: next };
    });
  }

  function validateStep(): boolean {
    const errors: Record<string, string> = {};
    if (step === 0) {
      if (!form.name?.trim()) errors.name = "Full name is required";
      if (!form.email?.trim()) errors.email = "Email is required";
      if (!form.password || form.password.length < 6) errors.password = "Password must be at least 6 characters";
      if (!form.phone?.trim()) errors.phone = "Phone number is required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!agreeTerms) { setError("You must agree to the terms"); return; }
    setLoading(true);
    setError("");
    try {
      await register(form);
      navigate({ to: "/agent/dashboard" });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          const flat: Record<string, string> = {};
          for (const [k, v] of Object.entries(err.errors)) flat[k] = v[0];
          setFieldErrors(flat);
        }
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  }

  function nextStep() {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

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

  function renderStep() {
    switch (step) {
      case 0: return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Ada Eze Okafor" />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="ada@example.com" />
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 6 characters" />
              {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+234 801 234 5678" />
              {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" type="tel" value={form.whatsapp || ""} onChange={(e) => update("whatsapp", e.target.value)} placeholder="Same as phone if empty" />
            </div>
          </div>
        </div>
      );

      case 1: return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agency">Agency / Company</Label>
            <Input id="agency" value={form.agency} onChange={(e) => update("agency", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state || ""} onChange={(e) => update("state", e.target.value)} placeholder="Lagos" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city || ""} onChange={(e) => update("city", e.target.value)} placeholder="Lekki" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience">Experience</Label>
            <Select value={form.experience || ""} onValueChange={(v) => update("experience", v)}>
              <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea id="bio" value={form.bio || ""} onChange={(e) => update("bio", e.target.value)}
              placeholder="Tell potential clients about yourself..." rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lasrera">LASRERA Number</Label>
              <Input id="lasrera" value={form.lasrera_number || ""} onChange={(e) => update("lasrera_number", e.target.value)} placeholder="LAS/REA/2024/XXXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="niesv">NIESV Number</Label>
              <Input id="niesv" value={form.niesv_number || ""} onChange={(e) => update("niesv_number", e.target.value)} />
            </div>
          </div>
        </div>
      );

      case 2: return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="avg_monthly_listings">Average Monthly Listings</Label>
            <Select value={form.avg_monthly_listings || ""} onValueChange={(v) => update("avg_monthly_listings", v)}>
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
            <Select value={form.avg_deal_size || ""} onValueChange={(v) => update("avg_deal_size", v)}>
              <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
              <SelectContent>
                {DEAL_SIZES.map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ChipSelect items={PROPERTY_TYPES} selected={form.property_types as string[]} onToggle={(v) => toggleArray("property_types", v)} label="Property Types" />
          <ChipSelect items={SPECIALIZATIONS} selected={form.specialization as string[]} onToggle={(v) => toggleArray("specialization", v)} label="Specializations" />
        </div>
      );

      case 3: return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Link your social profiles (optional)</p>
          {[
            ["social_instagram", "Instagram", "@username"],
            ["social_facebook", "Facebook", "username"],
            ["social_linkedin", "LinkedIn", "username"],
            ["social_tiktok", "TikTok", "@username"],
            ["social_youtube", "YouTube", "channel name"],
          ].map(([field, label, placeholder]) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>{label}</Label>
              <Input id={field} value={(form as any)[field] || ""}
                onChange={(e) => update(field as keyof RegisterPayload, e.target.value)}
                placeholder={placeholder} />
            </div>
          ))}
        </div>
      );

      case 4: return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="why_join">Why do you want to join AVR Homes?</Label>
            <Textarea id="why_join" value={form.why_join || ""} onChange={(e) => update("why_join", e.target.value)}
              placeholder="Share your motivation for joining our platform..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referral_source">How did you hear about us?</Label>
            <Input id="referral_source" value={form.referral_source || ""} onChange={(e) => update("referral_source", e.target.value)}
              placeholder="Friend, social media, Google, etc." />
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(v === true)} />
            <Label htmlFor="terms" className="text-sm leading-relaxed">
              I agree to the{" "}
              <Link to="/" className="text-primary hover:underline">Terms of Service</Link> and{" "}
              <Link to="/" className="text-primary hover:underline">Privacy Policy</Link>.
              I consent to AVR Homes processing my data as described in the NDPA compliance policy.
            </Label>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold">Become an AVR Agent</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join Lagos' verified luxury property marketplace</p>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i < step ? "bg-primary text-primary-foreground" :
                i === step ? "border-2 border-primary text-primary" :
                "border border-input text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-8 transition-colors ${i < step ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 font-semibold">{STEPS[step]}</h2>
          <form onSubmit={(e) => { e.preventDefault(); step === STEPS.length - 1 ? handleSubmit() : nextStep(); }}>
            {renderStep()}

            {error && (
              <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <div className="mt-6 flex items-center justify-between">
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={prevStep} className="rounded-full">
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              ) : <div />}
              {step < STEPS.length - 1 ? (
                <Button type="submit" className="rounded-full">
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" className="rounded-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Complete Registration
                </Button>
              )}
            </div>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/agent/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
