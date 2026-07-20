/**
 * Property detail route (/properties/$id).
 * Loads a single property by its numeric or prefixed (p-xxx, l-xxx) ID, then
 * renders full details: gallery with lightbox, stats, description, amenities,
 * mortgage calculator, agent sidebar, short-let booking or inquiry form, and similar listings.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BedDouble, Bath, Maximize2, MapPin, BadgeCheck, Phone, Mail, ArrowLeft, Heart, Share2, Calendar, Building2, Compass, Calculator, CheckCircle2, X, ChevronLeft, ChevronRight, Video, Globe, FileImage, Image as ImageIcon, HardHat, Clock } from "lucide-react";
import { useMemo, useState, useCallback, useEffect } from "react";
import { formatAED, formatNightlyPrice, getProperty, getAgent, properties, fetchProperty, submitInquiry } from "@/lib/properties";
import { ProgressTimeline } from "@/components/progress-timeline";
import { isSaved, toggleSavedProp } from "@/lib/saved";
import { PropertyCard } from "@/components/property-card";
import type { Property } from "@/lib/properties";

export const Route = createFileRoute("/properties/$id")({
  loader: async ({ params }) => {
    const id = parseInt(params.id.replace("p-", ""), 10);
    if (isNaN(id)) {
      const p = getProperty(params.id);
      if (!p) throw notFound();
      return { property: p as unknown as Property };
    }
    try {
      const property = await fetchProperty(id);
      return { property };
    } catch {
      const p = getProperty(params.id);
      if (!p) throw notFound();
      return { property: p as unknown as Property };
    }
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.property.title} — AVR Homes` },
      { name: "description", content: loaderData.property.description.slice(0, 160) },
      { property: "og:title", content: loaderData.property.title },
      { property: "og:description", content: loaderData.property.description.slice(0, 160) },
      { property: "og:image", content: loaderData.property.image },
      { property: "og:url", content: `https://avrusthomes.com/properties/${loaderData.property.id}` },
      { name: "twitter:card", content: "summary_large_image" },
    ] : [],
    links: loaderData ? [{ rel: "canonical", href: `https://avrusthomes.com/properties/${loaderData.property.id}` }] : [],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">Property not found</h1>
      <Link to="/properties" search={{ purpose: "buy" } as never} className="mt-4 inline-block text-primary hover:underline">Browse all listings</Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Retry</button>
    </div>
  ),
  component: Detail,
});

/** Full property detail component — gallery, stats, description, agent, booking/inquiry. */
function Detail() {
  const { property: p } = Route.useLoaderData();
  const agent = p.agent_id != null && !("agent_name" in p)
    ? getAgent(p.agent_id.toString())
    : p.agent_name
      ? { name: p.agent_name, agency: p.agent_agency || "", phone: p.agent_phone || "", email: p.agent_email || "", avatarHue: p.agent_avatar_hue || 0, listings: 0, languages: p.agent_languages || [], isVerified: p.agent_is_verified || false }
      : null;
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState(() => isSaved(String(p.id)));
  const [shared, setShared] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [mediaTab, setMediaTab] = useState<"photos" | "video" | "tour" | "plan">("photos");

  useEffect(() => {
    if (!p.lat || !p.lng) return;
    let destroyed = false;
    let mapInstance: any;

    function loadCSS() {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
    }

    function loadL(): Promise<any> {
      return new Promise((resolve) => {
        if ((window as any).L) return resolve((window as any).L);
        const s = document.createElement("script");
        s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
        s.crossOrigin = "";
        s.onload = () => {
          const L = (window as any).L;
          delete L.Icon.Default.prototype._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          });
          resolve(L);
        };
        document.head.appendChild(s);
      });
    }

    loadCSS();
    const el = document.getElementById("property-detail-map");
    if (!el) return;

    loadL().then((L) => {
      if (destroyed) return;
      mapInstance = L.map(el, { center: [p.lat, p.lng], zoom: 15, zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapInstance);
      L.marker([p.lat, p.lng]).addTo(mapInstance).bindPopup(`<b>${p.title}</b><br/>${p.community}, ${p.city}`);
      mapInstance.whenReady(() => setTimeout(() => mapInstance.invalidateSize(), 50));

      if (p.type === "land" && (p.area || 0) > 0) {
        const side = Math.sqrt(p.area);
        const half = side / 2;
        const latPerMeter = 1 / 111320;
        const lngPerMeter = 1 / (111320 * Math.cos((p.lat * Math.PI) / 180));
        const dLat = half * latPerMeter;
        const dLng = half * lngPerMeter;
        const corners: [[number, number], [number, number], [number, number], [number, number]] = [
          [p.lat - dLat, p.lng - dLng],
          [p.lat - dLat, p.lng + dLng],
          [p.lat + dLat, p.lng + dLng],
          [p.lat + dLat, p.lng - dLng],
        ];
        L.polygon(corners, { color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.15, weight: 2, dashArray: "5, 5" })
          .addTo(mapInstance)
          .bindTooltip(`${p.area.toLocaleString()} sqm`, { permanent: true, direction: "bottom" });
      }
    });

    return () => { destroyed = true; if (mapInstance) mapInstance.remove(); };
  }, [p.id]);

  const similar = useMemo(
    () => properties.filter((x) => x.id !== p.id && (x.community === p.community || x.type === p.type)).slice(0, 3),
    [p.id, p.community, p.type]
  );

  const videoCount = (p.videos && p.videos.length > 0) ? p.videos.length : (p.video_url ? 1 : 0);

  const mediaTabs = [
    { key: "photos" as const, icon: ImageIcon, label: "Photos", count: p.gallery.length },
    { key: "video" as const, icon: Video, label: "Video", count: videoCount, disabled: videoCount === 0 },
    { key: "tour" as const, icon: Globe, label: "Virtual Tour", disabled: !p.virtual_tour_url },
    { key: "plan" as const, icon: FileImage, label: "Floor Plan", disabled: !p.floor_plan_url },
  ].filter((t) => !(t as any).disabled || t.key === "photos");

  useEffect(() => {
    if (!lightboxOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i - 1 + p.gallery.length) % p.gallery.length);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i + 1) % p.gallery.length);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, p.gallery.length]);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 1500); }
    } catch { /* user cancelled */ }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link to="/properties" search={{ purpose: p.purpose } as never}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary">
            <Share2 className="h-3.5 w-3.5" /> {shared ? "Copied!" : "Share"}
          </button>
          <button onClick={() => { toggleSavedProp(String(p.id)); setSaved((s) => !s); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary">
            <Heart className={`h-3.5 w-3.5 ${saved ? "fill-destructive text-destructive" : ""}`} />
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Media Gallery */}
      <div className="mt-4">
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {mediaTabs.map((tab) => (
            <button key={tab.key} onClick={() => setMediaTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${mediaTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count != null && <span className="ml-0.5 text-xs opacity-70">({tab.count})</span>}
            </button>
          ))}
        </div>

        <div className="mt-3">
          {mediaTab === "photos" && (
            <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <button onClick={() => { setLightboxIndex(active); setLightboxOpen(true); }}
                className="aspect-[4/3] overflow-hidden rounded-2xl text-left">
                <img src={p.gallery[active] || p.image} alt={p.title} className="h-full w-full object-cover" />
              </button>
              {p.gallery.length > 0 && (
                <div className="grid grid-cols-3 gap-3 md:grid-cols-1">
                  {p.gallery.slice(0, 3).map((src: string, i: number) => (
                    <button key={i} onClick={() => setActive(i)}
                      className={`aspect-[4/3] overflow-hidden rounded-xl ring-2 transition ${active === i ? "ring-primary" : "ring-transparent hover:ring-border"}`}>
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {mediaTab === "video" && videoCount > 0 && (
            <div className="space-y-3">
              {((p.videos && p.videos.length > 0) ? p.videos : (p.video_url ? [{ url: p.video_url! }] : [])).map((v, i) => (
                <div key={i} className="aspect-video overflow-hidden rounded-2xl bg-black">
                  {v.url.includes("youtube.com") || v.url.includes("youtu.be") || v.url.includes("vimeo.com") ? (
                    <iframe src={embedUrl(v.url)} title={`Property video ${i + 1}`} className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  ) : (
                    <video src={v.url} controls className="h-full w-full" />
                  )}
                </div>
              ))}
            </div>
          )}

          {mediaTab === "tour" && p.virtual_tour_url && (
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-black">
              <iframe src={embedUrl(p.virtual_tour_url)} title="Virtual Tour" className="h-full w-full"
                allow="fullscreen" allowFullScreen />
            </div>
          )}

          {mediaTab === "plan" && p.floor_plan_url && (
            <a href={p.floor_plan_url} target="_blank" rel="noreferrer"
              className="flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-card">
              <img src={p.floor_plan_url} alt="Floor plan" className="max-h-[500px] w-full object-contain" />
            </a>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && p.gallery.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxOpen(false)}>
          <button onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30">
            <X className="h-5 w-5" />
          </button>
          {p.gallery.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + p.gallery.length) % p.gallery.length); }}
                className="absolute left-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % p.gallery.length); }}
                className="absolute right-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30 md:right-20">
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <img src={p.gallery[lightboxIndex]} alt="" className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()} />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-3 py-1 text-xs text-white">
            {lightboxIndex + 1} / {p.gallery.length}
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary-foreground">For {p.purpose}</span>
            {(p.verified || p.is_verified) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-medium text-[var(--gold-foreground)]">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
            {(p as any).is_off_plan && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-medium text-white">
                <HardHat className="h-3.5 w-3.5" /> Off-Plan
              </span>
            )}
            <span className="text-xs text-muted-foreground">Listed {(p.posted_days_ago ?? p.postedDaysAgo) === 0 ? "today" : `${(p.posted_days_ago ?? p.postedDaysAgo)}d ago`}</span>
          </div>
          <h1 className="mt-3 font-display text-2xl font-semibold sm:text-4xl">{p.title}</h1>
          <div className="mt-1 inline-flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> <span>{p.address} · {p.community}, {p.city}</span>
          </div>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            {p.purpose === "shortlet" && p.nightly_price ? (
              <div className="font-display text-3xl font-semibold text-primary sm:text-4xl">{formatNightlyPrice(p.nightly_price)}</div>
            ) : (
              <div className="font-display text-3xl font-semibold text-primary sm:text-4xl">{formatAED(p.price)}</div>
            )}
            {p.purpose === "rent" && <span className="text-sm text-muted-foreground">/year</span>}
            {p.purpose === "shortlet" && p.min_stay && <span className="text-sm text-muted-foreground">min {p.min_stay} night{p.min_stay > 1 ? "s" : ""}</span>}
            <span className="text-xs text-muted-foreground">· {formatAED(Math.round(p.price / p.area))}/sqm</span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-4">
            <Stat icon={<BedDouble className="h-5 w-5" />} label="Beds" value={p.beds || "Studio"} />
            <Stat icon={<Bath className="h-5 w-5" />} label="Baths" value={p.baths} />
            <Stat icon={<Maximize2 className="h-5 w-5" />} label="Area" value={`${p.area.toLocaleString()} sqm`} />
          </div>

          <section className="mt-8">
            <h2 className="font-display text-2xl font-semibold">About this home</h2>
            <p className="mt-3 leading-relaxed text-foreground/80">{p.description}</p>
          </section>

          {(p as any).is_off_plan && (
            <section className="mt-8">
              <ProgressTimeline propertyId={Number(p.id)} />
            </section>
          )}

          <section className="mt-8">
            <h2 className="font-display text-2xl font-semibold">Property details</h2>
            <dl className="mt-3 grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
              <Detail2 icon={<Building2 className="h-4 w-4" />} label="Type" value={p.type} />
              <Detail2 icon={<Compass className="h-4 w-4" />} label="Reference" value={String(p.id)} />
              <Detail2 icon={<Calendar className="h-4 w-4" />} label="Listed" value={(p.postedDaysAgo ?? 0) === 0 ? "Today" : `${p.postedDaysAgo ?? 0} days ago`} />
              <Detail2 icon={<MapPin className="h-4 w-4" />} label="Community" value={p.community} />
              <Detail2 icon={<Maximize2 className="h-4 w-4" />} label="Plot area" value={`${p.area.toLocaleString()} sqm`} />
              {(p as any).is_off_plan && (p as any).completion_date && (
                <Detail2 icon={<Clock className="h-4 w-4" />} label="Est. Completion" value={new Date((p as any).completion_date).toLocaleDateString("en-US", { month: "long", year: "numeric" })} />
              )}
              <Detail2 icon={<BedDouble className="h-4 w-4" />} label="Furnishing" value={p.amenities.includes("Furnished") ? "Furnished" : "Unfurnished"} />
              {p.purpose === "shortlet" && (
                <Detail2 icon={<Calendar className="h-4 w-4" />} label="Min stay" value={`${p.min_stay || 1} night${(p.min_stay || 1) > 1 ? "s" : ""}${p.max_stay ? ` — max ${p.max_stay} nights` : ""}`} />
              )}
            </dl>
          </section>

          <section className="mt-8">
            <h2 className="font-display text-2xl font-semibold">Amenities</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {p.amenities.map((a: string) => (
                <li key={a} className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {a}
                </li>
              ))}
            </ul>
          </section>

          {p.purpose === "buy" && (
            <section className="mt-8">
              <h2 className="font-display text-2xl font-semibold">Mortgage estimate</h2>
              <MortgageCalc price={p.price} />
            </section>
          )}

          <section className="mt-8">
            <h2 className="font-display text-2xl font-semibold">Location</h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-border">
              <div className="h-[350px] w-full" id="property-detail-map" />
            </div>
            {p.type === "land" && p.area > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Dashed outline shows approximate {p.area.toLocaleString()} sqm boundary.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition"
              >
                <MapPin className="h-4 w-4" />
                Get directions (Google Maps)
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition"
              >
                <MapPin className="h-4 w-4" />
                View on Google Maps
              </a>
            </div>
          </section>

          {similar.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-2xl font-semibold">Similar properties</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {similar.map((s) => <PropertyCard key={s.id} p={s} />)}
              </div>
            </section>
          )}
        </div>

        {/* Agent sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            {agent && (
              <>
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full font-display text-lg font-semibold text-primary-foreground"
                    style={{ background: `oklch(0.5 0.1 ${agent.avatarHue})` }}>
                    {agent.name.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{agent.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{agent.agency} · {agent.listings} listings</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  <a href={`tel:${agent.phone}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
                    <Phone className="h-4 w-4" /> Call agent
                  </a>
                  <a href={`mailto:${agent.email}?subject=Inquiry about ${encodeURIComponent(p.title)}`} className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-secondary">
                    <Mail className="h-4 w-4" /> Email agent
                  </a>
                  <a href={`https://wa.me/${agent.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${agent.name}, I'm interested in ${p.title}.\n\nView listing: ${typeof window !== "undefined" ? window.location.href : `https://avrusthomes.com/properties/${p.id}`}`)}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-secondary">
                    WhatsApp
                  </a>
                </div>
              </>
            )}
          </div>
              {p.purpose === "shortlet" ? (
                <ShortletBooking property={p} />
              ) : (
                <InquiryForm propertyId={Number(p.id)} propertyTitle={p.title} />
              )}
          </aside>
      </div>
    </div>
  );
}

/** Short-let booking widget — date selection, availability check, guest count and booking submission. */
function ShortletBooking({ property }: { property: Property }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [bookingData, setBookingData] = useState<{ total_price: number; nights: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function checkAvailability() {
    if (!checkIn || !checkOut) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/shortlet/${String(property.id)}/availability?check_in=${checkIn}&check_out=${checkOut}`);
      const data = await res.json();
      if (data.status === 'success') {
        if (data.data.is_available) {
          setBookingData({ total_price: data.data.total_price, nights: data.data.nights });
        } else {
          setError("Property is not available for the selected dates.");
          setBookingData(null);
        }
      } else {
        setError(data.message || "Availability check failed");
        setBookingData(null);
      }
    } catch {
      // Fallback: calculate locally
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
      if (nights < (property.min_stay || 1)) {
        setError(`Minimum stay is ${property.min_stay || 1} night(s)`);
        setBookingData(null);
        setLoading(false);
        return;
      }
      const nightly = property.nightly_price || property.price;
      setBookingData({ total_price: nightly * nights, nights });
    }
    setLoading(false);
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingData) return;
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/shortlet/${String(property.id)}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: form.get("name"),
          guest_email: form.get("email"),
          guest_phone: form.get("phone"),
          check_in: checkIn,
          check_out: checkOut,
          guests,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSuccess(true);
      } else {
        setError(data.message || "Booking failed");
      }
    } catch {
      setError("Booking submission failed. Please try again.");
    }
    setLoading(false);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="font-display text-lg font-semibold">Book this stay</h3>
      {success ? (
        <div className="mt-3 rounded-lg bg-primary/10 p-3 text-sm text-primary">
          Booking request submitted! The host will confirm shortly.
        </div>
      ) : (
        <form onSubmit={handleBook} className="mt-3 grid gap-3">
          {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Check-in</span>
            <input type="date" value={checkIn} min={today} required
              onChange={(e) => { setCheckIn(e.target.value); setBookingData(null); }}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Check-out</span>
            <input type="date" value={checkOut} min={checkIn || today} required
              onChange={(e) => { setCheckOut(e.target.value); setBookingData(null); }}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Guests</span>
            <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>)}
            </select>
          </label>

          {checkIn && checkOut && !bookingData && !error && (
            <button type="button" onClick={checkAvailability} disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {loading ? "Checking..." : "Check availability"}
            </button>
          )}

          {bookingData && (
            <>
              <div className="rounded-lg bg-secondary/60 p-3 text-sm">
                <div className="flex justify-between">
                  <span>Nightly rate</span>
                  <span className="font-semibold">{formatNightlyPrice(property.nightly_price || property.price)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>{bookingData.nights} night{bookingData.nights > 1 ? "s" : ""}</span>
                  <span className="font-semibold">{formatAED(bookingData.total_price)}</span>
                </div>
                <div className="mt-2 border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatAED(bookingData.total_price)}</span>
                </div>
              </div>

              <input required name="name" placeholder="Your full name" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <input required type="email" name="email" placeholder="Email address" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <input required type="tel" name="phone" placeholder="Phone number" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />

              <button type="submit" disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {loading ? "Booking..." : "Request to book"}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}

/** Converts a YouTube / Vimeo URL to its embeddable equivalent with autoplay. Falls back to the raw URL. */
function embedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const v = u.searchParams.get("v") || u.pathname.slice(1);
      return `https://www.youtube.com/embed/${v}?autoplay=1`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.slice(1);
      return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }
  } catch { /* not a URL, return as-is */ }
  return url;
}

/** A circular stat icon with a label and value used in the key-facts row (beds, baths, area). */
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="mt-1.5 text-base font-semibold">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

/** A single property-detail row (icon, label, value) used in the details panel. */
function Detail2({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0 sm:border-0 sm:pb-0">
      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{icon}</span>{label}
      </span>
      <span className="text-sm font-medium capitalize">{value}</span>
    </div>
  );
}

/** Interactive mortgage estimate calculator with down payment, tenure, and interest sliders. */
function MortgageCalc({ price }: { price: number }) {
  const [downPct, setDownPct] = useState(30);
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(18);
  const down = Math.round((price * downPct) / 100);
  const principal = price - down;
  const r = rate / 100 / 12;
  const n = years * 12;
  const monthly = r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));

  return (
    <div className="mt-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calculator className="h-4 w-4 text-primary" /> Estimated monthly payment
      </div>
      <div className="mt-1 font-display text-3xl font-semibold text-primary">{formatAED(Math.round(monthly))}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Range label="Down payment" suffix="%" min={10} max={80} value={downPct} onChange={setDownPct} />
        <Range label="Tenure" suffix=" yrs" min={5} max={30} value={years} onChange={setYears} />
        <Range label="Interest" suffix="%" min={5} max={30} value={rate} onChange={setRate} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-secondary/60 p-3">
          <div className="text-xs text-muted-foreground">Down payment</div>
          <div className="font-semibold">{formatAED(down)}</div>
        </div>
        <div className="rounded-lg bg-secondary/60 p-3">
          <div className="text-xs text-muted-foreground">Loan amount</div>
          <div className="font-semibold">{formatAED(principal)}</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Indicative only. Actual offers depend on lender and credit assessment.</p>
    </div>
  );
}

/** A labelled range slider input used inside the mortgage calculator. */
function Range({ label, suffix, min, max, value, onChange }: { label: string; suffix: string; min: number; max: number; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-primary" />
    </label>
  );
}

/** Viewing-request form shown in the sidebar for buy/rent properties (not short-let). */
function InquiryForm({ propertyId, propertyTitle }: { propertyId: number; propertyTitle: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const propertyUrl = typeof window !== "undefined" ? window.location.href : `https://avrusthomes.com/properties/${propertyId}`;
      const msg = `${form.get("message") as string}\n\nProperty: ${propertyUrl}`;
      await submitInquiry({
        name: form.get("name") as string,
        email: form.get("email") as string,
        phone: form.get("phone") as string,
        message: msg,
        property_id: propertyId,
        property_url: propertyUrl,
      });
      setSent(true);
    } catch {
      setError("Failed to send. Try emailing the agent directly.");
    }
  }

  return (
    <form onSubmit={handleSubmit}
      className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="font-display text-lg font-semibold">Request a viewing</h3>
      {sent ? (
        <div className="mt-3 rounded-lg bg-primary/10 p-3 text-sm text-primary">
          Thanks! An agent will reach out shortly.
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <input required name="name" placeholder="Your name" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input required type="email" name="email" placeholder="Email" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input required type="tel" name="phone" placeholder="Phone" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <textarea name="message" rows={3} defaultValue={`I'd like to schedule a viewing for "${propertyTitle}".`}
            className="resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Send inquiry
          </button>
        </div>
      )}
    </form>
  );
}
