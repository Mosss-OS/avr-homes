"use client";

/**
 * Property detail page — gallery, price, key facts, description, amenities,
 * agent card, inquiry form, off-plan progress, map, and similar listings.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { PropertyCard } from "@/components/property-card";
import { ProgressTimeline } from "@/components/progress-timeline";
import { MiniMap } from "@/components/mini-map";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProperty, fetchProperties, formatPrice, formatNightlyPrice, submitInquiry, type Currency, type Property } from "@/lib/properties";
import { optimizedImageUrl } from "@/lib/cloudinary";
import {
  BadgeCheck, BedDouble, Bath, Maximize2, MapPin, Phone, Mail, CheckCircle2,
  HardHat, Globe, Play, ChevronLeft, ChevronRight, Send, Loader2, Building2,
  CalendarDays, FileText, Video, Check,
} from "lucide-react";

const CURRENCIES: Currency[] = ["NGN", "USD", "GBP"];
const SYMBOLS: Record<Currency, string> = { NGN: "₦", USD: "$", GBP: "£" };

export default function PropertyDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [p, setP] = useState<Property | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [imageIndex, setImageIndex] = useState(0);
  const [similar, setSimilar] = useState<Property[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setStatus("loading");
    setImageIndex(0);
    fetchProperty(id)
      .then((prop) => {
        if (cancelled) return;
        setP(prop);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(err instanceof ApiError && err.status === 404 ? "missing" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!p) return;
    let cancelled = false;
    fetchProperties({ city: p.city, purpose: p.purpose, per_page: "4" })
      .then((res) => {
        if (cancelled) return;
        setSimilar(res.data.filter((s) => Number(s.id) !== Number(p.id)).slice(0, 3));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [p]);

  if (status === "loading" || !p) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 aspect-[16/9] w-full rounded-2xl" />
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Property not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This listing may have been removed or is no longer available.
        </p>
        <Link
          href="/properties"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Browse all properties
        </Link>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">We couldn&apos;t load this property right now.</p>
        <Link
          href="/properties"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Back to properties
        </Link>
      </div>
    );
  }

  const gallery = p.gallery?.length ? p.gallery : p.image ? [String(p.image)] : [];
  const mainImage = gallery[imageIndex] ?? p.image;
  const isOffPlan = Boolean((p as any).is_off_plan);
  const isShortlet = p.purpose === "shortlet";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <Link href="/properties" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> Back to properties
      </Link>

      {/* Gallery */}
      <div className="mt-5">
        <div className="relative overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-card)]">
          <div className="aspect-[16/9] bg-secondary/40">
            {mainImage ? (
              <img
                src={optimizedImageUrl(mainImage)}
                alt={p.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-muted-foreground">
                <Building2 className="h-12 w-12" />
              </div>
            )}
          </div>
          {p.video_url && (
            <a
              href={p.video_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Play video"
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70">
                <Play className="ml-0.5 h-7 w-7" />
              </span>
            </a>
          )}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {(p.verified || p.is_verified) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-background/95 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur">
                <BadgeCheck className="h-4 w-4" /> Verified
              </span>
            )}
            {isOffPlan && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                <HardHat className="h-4 w-4" /> Off-Plan
              </span>
            )}
          </div>
        </div>
        {gallery.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {gallery.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setImageIndex(i)}
                className={`h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                  i === imageIndex ? "border-primary" : "border-border hover:border-primary/40"
                }`}
              >
                <img src={optimizedImageUrl(img)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-10 lg:col-span-2">
          {/* Header */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>
              {p.community ? `${p.community}, ` : ""}{p.city}
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">{p.title}</h1>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl font-bold">
                  {isShortlet && p.nightly_price
                    ? formatNightlyPrice(p.nightly_price, currency)
                    : formatPrice(p.price, currency)}
                </span>
                {p.purpose === "rent" && (
                  <span className="text-sm font-normal text-muted-foreground">/yr</span>
                )}
                <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-secondary/60 p-0.5 text-xs font-semibold">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      className={`rounded-full px-2.5 py-1 transition ${currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      aria-label={`Show price in ${c}`}
                    >
                      {SYMBOLS[c]}
                    </button>
                  ))}
                </div>
              </div>
              <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-primary">
                For {p.purpose.replace(/-/g, " ")}
              </span>
            </div>
          </div>

          {/* Key facts */}
          <section>
            <h2 className="font-display text-xl font-semibold">Overview</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Fact icon={<BedDouble className="h-5 w-5" />} label="Bedrooms" value={p.beds ? String(p.beds) : "Studio"} />
              <Fact icon={<Bath className="h-5 w-5" />} label="Bathrooms" value={String(p.baths)} />
              <Fact icon={<Maximize2 className="h-5 w-5" />} label="Area" value={`${Number(p.area).toLocaleString()} sqm`} />
              <Fact icon={<Building2 className="h-5 w-5" />} label="Type" value={p.type} />
              <Fact icon={<MapPin className="h-5 w-5" />} label="Location" value={p.community || p.city} />
              {isShortlet && (
                <Fact icon={<CalendarDays className="h-5 w-5" />} label="Min stay" value={`${p.min_stay ?? 1} night${(p.min_stay ?? 1) > 1 ? "s" : ""}`} />
              )}
            </div>
          </section>

          {/* Description */}
          <section>
            <h2 className="font-display text-xl font-semibold">About this property</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base">
              {p.description || "No description provided."}
            </p>
          </section>

          {/* Amenities */}
          {p.amenities?.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold">Amenities</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.amenities.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm">
                    <Check className="h-3.5 w-3.5 text-primary" /> {a}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Media links */}
          {(p.virtual_tour_url || p.floor_plan_url || p.video_url) && (
            <section className="flex flex-wrap gap-3">
              {p.virtual_tour_url && (
                <a href={p.virtual_tour_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-secondary">
                  <Globe className="h-4 w-4 text-primary" /> Virtual tour
                </a>
              )}
              {p.floor_plan_url && (
                <a href={p.floor_plan_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-secondary">
                  <FileText className="h-4 w-4 text-primary" /> Floor plan
                </a>
              )}
              {p.video_url && (
                <a href={p.video_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-secondary">
                  <Video className="h-4 w-4 text-primary" /> Watch video
                </a>
              )}
            </section>
          )}

          {/* Off-plan progress */}
          {isOffPlan && <ProgressTimeline propertyId={Number(p.id)} />}

          {/* Map */}
          <section>
            <h2 className="font-display text-xl font-semibold">Location</h2>
            <div className="mt-4">
              <MiniMap items={[p]} />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Agent card */}
          {(p.agent_name || p.agent_agency) && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                  style={{ background: p.agent_avatar_hue ? `oklch(0.45 0.1 ${p.agent_avatar_hue})` : "oklch(0.45 0.1 200)" }}
                >
                  {(p.agent_name || "A").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-semibold">
                    {p.agent_name}
                    {p.agent_is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.agent_agency}</div>
                </div>
              </div>
              {p.agent_phone && (
                <a href={`tel:${p.agent_phone}`} className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                  <Phone className="h-4 w-4" /> Call {p.agent_phone}
                </a>
              )}
              {p.agent_email && (
                <a href={`mailto:${p.agent_email}`} className="mt-2 flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-secondary">
                  <Mail className="h-4 w-4 text-primary" /> Email agent
                </a>
              )}
            </div>
          )}

          {/* Inquiry form */}
          <InquiryForm propertyId={Number(p.id)} propertyTitle={p.title} />
        </aside>
      </div>

      {/* Similar properties */}
      {similar.length > 0 && (
        <section className="mt-14">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>You may also like</p>
              <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Similar {p.purpose.replace(/-/g, " ")}s in {p.city}</h2>
            </div>
            <Link href={`/properties?city=${encodeURIComponent(p.city)}&purpose=${p.purpose}`}
              className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex">
              See all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => <PropertyCard key={s.id} p={s} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1.5 font-medium capitalize">{value}</div>
    </div>
  );
}

function InquiryForm({ propertyId, propertyTitle }: { propertyId: number; propertyTitle: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim() || !email.trim() || !phone.trim() || message.trim().length < 10) {
      setErrorMsg("Please fill in your details and a message of at least 10 characters.");
      return;
    }
    setSending(true);
    try {
      await submitInquiry({ property_id: propertyId, name, email, phone, message });
      setDone(true);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-[var(--shadow-card)]">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <h3 className="mt-3 font-display text-lg font-semibold">Message sent</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your enquiry about {propertyTitle} has been submitted. An agent will reach out shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="font-display text-lg font-semibold">Request more info</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Send a direct enquiry to the agent listing this property.
      </p>
      <div className="mt-4 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="I'm interested in this property…"
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      </div>
      {errorMsg && <p className="mt-3 text-xs text-destructive">{errorMsg}</p>}
      <button
        type="submit"
        disabled={sending}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {sending ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
