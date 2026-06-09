import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-dubai.jpg";
import { SearchBar } from "@/components/search-bar";
import { PropertyCard } from "@/components/property-card";
import { properties } from "@/lib/properties";
import { ArrowRight, ShieldCheck, Sparkles, Map } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Manzil — UAE Property Search" },
      { name: "description", content: "Discover apartments, villas, and townhouses across Dubai, Abu Dhabi, and the UAE." },
    ],
  }),
  component: Home,
});

function Home() {
  const featured = properties.filter((p) => p.featured);
  const fresh = properties.slice(0, 6);
  return (
    <>
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="Dubai skyline at dusk" width={1920} height={1080}
            className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 md:pb-24 md:pt-36">
          <div className="max-w-3xl text-primary-foreground">
            <span className="inline-flex items-center gap-2 rounded-full bg-background/15 px-3 py-1 text-xs font-medium uppercase tracking-wider backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[var(--gold)]" /> The UAE home search, reimagined
            </span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] sm:text-5xl md:text-6xl">
              Find a place to call <span className="text-[var(--gold)]">manzil</span>.
            </h1>
            <p className="mt-4 max-w-xl text-base text-primary-foreground/85 sm:text-lg">
              From skyline penthouses in Downtown to beachfront villas on the Palm — explore thousands of verified listings across the Emirates.
            </p>
          </div>
          <div className="mt-8 max-w-4xl"><SearchBar /></div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 sm:grid-cols-4 sm:px-6">
          {[
            { k: "12,400+", v: "Live listings" },
            { k: "850+", v: "Verified agents" },
            { k: "32", v: "Communities" },
            { k: "4.9★", v: "Avg. rating" },
          ].map((s) => (
            <div key={s.v} className="text-center">
              <div className="font-display text-2xl font-semibold text-primary">{s.k}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--gold)]">Featured</p>
            <h2 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">Hand-picked homes</h2>
          </div>
          <Link to="/properties" search={{ purpose: "buy" } as never}
            className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex">
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-3">
        <ValueCard icon={<ShieldCheck className="h-5 w-5" />} title="Verified listings"
          body="Every featured listing is checked for accuracy — no duplicates, no bait." />
        <ValueCard icon={<Map className="h-5 w-5" />} title="Map-first search"
          body="Draw an area, save a search, get alerts when a matching home goes live." />
        <ValueCard icon={<Sparkles className="h-5 w-5" />} title="Trusted agents"
          body="Talk directly to top-rated UAE agents — no middleman, no spam calls." />
      </section>

      {/* Recent */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">Recently added</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fresh.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      </section>
    </>
  );
}

function ValueCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
