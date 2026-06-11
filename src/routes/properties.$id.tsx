import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BedDouble, Bath, Maximize2, MapPin, BadgeCheck, Phone, Mail, ArrowLeft, Heart, Share2, Calendar, Building2, Compass, Calculator, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { formatAED, getProperty, getAgent, properties } from "@/lib/properties";
import { isSaved, toggleSavedProp } from "@/lib/saved";
import { PropertyCard } from "@/components/property-card";

export const Route = createFileRoute("/properties/$id")({
  loader: ({ params }) => {
    const p = getProperty(params.id);
    if (!p) throw notFound();
    return { property: p };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.property.title} — AVR Homes` },
      { name: "description", content: loaderData.property.description.slice(0, 160) },
      { property: "og:title", content: loaderData.property.title },
      { property: "og:description", content: loaderData.property.description.slice(0, 160) },
      { property: "og:image", content: loaderData.property.image },
    ] : [],
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

function Detail() {
  const { property: p } = Route.useLoaderData();
  const agent = getAgent(p.agentId);
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState(() => isSaved(p.id));
  const [shared, setShared] = useState(false);

  const similar = useMemo(
    () => properties.filter((x) => x.id !== p.id && (x.community === p.community || x.type === p.type)).slice(0, 3),
    [p.id, p.community, p.type]
  );

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
          <button onClick={() => { toggleSavedProp(p.id); setSaved((s) => !s); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary">
            <Heart className={`h-3.5 w-3.5 ${saved ? "fill-destructive text-destructive" : ""}`} />
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr]">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl">
          <img src={p.gallery[active]} alt={p.title} className="h-full w-full object-cover" />
        </div>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-1">
          {p.gallery.slice(0, 3).map((src: string, i: number) => (
            <button key={i} onClick={() => setActive(i)}
              className={`aspect-[4/3] overflow-hidden rounded-xl ring-2 transition ${active === i ? "ring-primary" : "ring-transparent hover:ring-border"}`}>
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary-foreground">For {p.purpose}</span>
            {p.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-medium text-[var(--gold-foreground)]">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
            <span className="text-xs text-muted-foreground">Listed {p.postedDaysAgo === 0 ? "today" : `${p.postedDaysAgo}d ago`}</span>
          </div>
          <h1 className="mt-3 font-display text-2xl font-semibold sm:text-4xl">{p.title}</h1>
          <div className="mt-1 inline-flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> <span>{p.address} · {p.community}, {p.city}</span>
          </div>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <div className="font-display text-3xl font-semibold text-primary sm:text-4xl">{formatAED(p.price)}</div>
            {p.purpose === "rent" && <span className="text-sm text-muted-foreground">/year</span>}
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

          <section className="mt-8">
            <h2 className="font-display text-2xl font-semibold">Property details</h2>
            <dl className="mt-3 grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
              <Detail2 icon={<Building2 className="h-4 w-4" />} label="Type" value={p.type} />
              <Detail2 icon={<Compass className="h-4 w-4" />} label="Reference" value={p.id.toUpperCase()} />
              <Detail2 icon={<Calendar className="h-4 w-4" />} label="Listed" value={p.postedDaysAgo === 0 ? "Today" : `${p.postedDaysAgo} days ago`} />
              <Detail2 icon={<MapPin className="h-4 w-4" />} label="Community" value={p.community} />
              <Detail2 icon={<Maximize2 className="h-4 w-4" />} label="Plot area" value={`${p.area.toLocaleString()} sqm`} />
              <Detail2 icon={<BedDouble className="h-4 w-4" />} label="Furnishing" value={p.amenities.includes("Furnished") ? "Furnished" : "Unfurnished"} />
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
            <div className="mt-3 aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-secondary/50 sm:aspect-[16/7]">
              <div className="relative h-full w-full"
                style={{
                  background: `radial-gradient(circle at 50% 50%, oklch(0.92 0.04 195) 0%, oklch(0.88 0.03 200) 60%, oklch(0.82 0.02 200) 100%)`,
                }}>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="mt-2 rounded-md bg-background px-2 py-1 text-xs font-medium shadow">
                    {p.community}
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground">
                  {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                </div>
              </div>
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
                    {agent.name.split(" ").map((n) => n[0]).join("")}
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
                  <a href={`https://wa.me/${agent.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${agent.name}, I'm interested in ${p.title} (${p.id.toUpperCase()}).`)}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-secondary">
                    WhatsApp
                  </a>
                </div>
              </>
            )}
          </div>
          <InquiryForm propertyTitle={p.title} />
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="mt-1.5 text-base font-semibold">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

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

function InquiryForm({ propertyTitle }: { propertyTitle: string }) {
  const [sent, setSent] = useState(false);
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}
      className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="font-display text-lg font-semibold">Request a viewing</h3>
      {sent ? (
        <div className="mt-3 rounded-lg bg-primary/10 p-3 text-sm text-primary">
          Thanks! An agent will reach out shortly.
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          <input required placeholder="Your name" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input required type="tel" placeholder="Phone" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <textarea rows={3} defaultValue={`I'd like to schedule a viewing for "${propertyTitle}".`}
            className="resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Send inquiry
          </button>
        </div>
      )}
    </form>
  );
}
