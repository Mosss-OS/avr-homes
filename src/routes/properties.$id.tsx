import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BedDouble, Bath, Maximize2, MapPin, BadgeCheck, Phone, Mail, ArrowLeft, Heart } from "lucide-react";
import { useState } from "react";
import { formatAED, getProperty, getAgent } from "@/lib/properties";
import { isSaved, toggleSavedProp } from "@/lib/saved";

export const Route = createFileRoute("/properties/$id")({
  loader: ({ params }) => {
    const p = getProperty(params.id);
    if (!p) throw notFound();
    return { property: p };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.property.title} — Manzil` },
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link to="/properties" search={{ purpose: p.purpose } as never}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to listings
      </Link>

      {/* Gallery */}
      <div className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr]">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl">
          <img src={p.gallery[active]} alt={p.title} className="h-full w-full object-cover" />
        </div>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-1">
          {p.gallery.slice(0, 3).map((src, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`aspect-[4/3] overflow-hidden rounded-xl ring-2 transition ${active === i ? "ring-primary" : "ring-transparent hover:ring-border"}`}>
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary-foreground">For {p.purpose}</span>
            {p.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-medium text-[var(--gold-foreground)]">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
            <span className="text-xs text-muted-foreground">Listed {p.postedDaysAgo === 0 ? "today" : `${p.postedDaysAgo}d ago`}</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{p.title}</h1>
          <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {p.address} · {p.community}, {p.city}
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <div className="font-display text-4xl font-semibold text-primary">{formatAED(p.price)}</div>
            {p.purpose === "rent" && <span className="text-sm text-muted-foreground">/year</span>}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-4">
            <Stat icon={<BedDouble className="h-5 w-5" />} label="Beds" value={p.beds || "Studio"} />
            <Stat icon={<Bath className="h-5 w-5" />} label="Baths" value={p.baths} />
            <Stat icon={<Maximize2 className="h-5 w-5" />} label="Area" value={`${p.area.toLocaleString()} sqft`} />
          </div>

          <section className="mt-8">
            <h2 className="font-display text-2xl font-semibold">About this home</h2>
            <p className="mt-3 text-foreground/80 leading-relaxed">{p.description}</p>
          </section>

          <section className="mt-8">
            <h2 className="font-display text-2xl font-semibold">Amenities</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {p.amenities.map((a) => (
                <li key={a} className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" /> {a}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="font-display text-2xl font-semibold">Location</h2>
            <div className="mt-3 aspect-[16/7] overflow-hidden rounded-2xl border border-border bg-secondary/50">
              <div className="relative h-full w-full"
                style={{
                  background: `radial-gradient(circle at 50% 50%, oklch(0.92 0.04 195) 0%, oklch(0.88 0.03 200) 60%, oklch(0.82 0.02 200) 100%)`,
                }}>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="mt-2 rounded-md bg-background px-2 py-1 text-center text-xs font-medium shadow">
                    {p.community}
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground">
                  {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Agent sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            {agent && (
              <>
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full font-display text-lg font-semibold text-primary-foreground"
                    style={{ background: `oklch(0.5 0.1 ${agent.avatarHue})` }}>
                    {agent.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <div className="font-semibold">{agent.name}</div>
                    <div className="text-xs text-muted-foreground">{agent.agency}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  <a href={`tel:${agent.phone}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
                    <Phone className="h-4 w-4" /> Call {agent.phone}
                  </a>
                  <a href={`mailto:${agent.email}`} className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-secondary">
                    <Mail className="h-4 w-4" /> Email agent
                  </a>
                </div>
              </>
            )}
            <button onClick={() => { toggleSavedProp(p.id); setSaved((s) => !s); }}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-secondary">
              <Heart className={`h-4 w-4 ${saved ? "fill-destructive text-destructive" : ""}`} />
              {saved ? "Saved" : "Save property"}
            </button>
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-4 text-xs text-muted-foreground">
            Reference ID: <span className="font-mono text-foreground/70">{p.id.toUpperCase()}</span>
          </div>
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
