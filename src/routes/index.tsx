import { createFileRoute, Link } from "@tanstack/react-router";
import { SearchBar } from "@/components/search-bar";
import { PropertyCard } from "@/components/property-card";
import { BrowseSection } from "@/components/browse-section";
import { AiSearchWidget } from "@/components/ai-search-widget";
import { fetchProperties, properties } from "@/lib/properties";
import { api } from "@/lib/api-client";
import { useEffect, useState } from "react";
import type { Property } from "@/lib/properties";
import { ArrowRight, ShieldCheck, Sparkles, Map, Home, BarChart3, Users, Star, Plane, FileCheck, Banknote, Search, Play, Heart, Building2, MapPin, LandPlot, Gem, ChevronRight } from "lucide-react";
import heroLekki from "@/assets/hero-lekki.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AVR Homes — Lagos Verified Luxury Property" },
      { name: "description", content: "Buy, rent or invest in verified luxury properties across Lagos. AVR Homes connects serious buyers with professional realtors across Lekki, Ikoyi, Victoria Island and Eko Atlantic." },
      { property: "og:title", content: "AVR Homes — Lagos Verified Luxury Property" },
      { property: "og:description", content: "Buy, rent or invest in verified luxury properties across Lagos — the premier marketplace for Lagos luxury real estate." },
      { property: "og:url", content: "https://avrusthomes.com" },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com" }],
  }),
  component: HomePage,
});

interface AgentLogo { id: number; name: string; agency: string; avatar_hue?: number; avatar_url?: string; listings: number; }
interface StatsData { total_properties: number; featured_properties: number; cities_covered: number; total_agents: number; total_users: number; }

function HomePage() {
  const [featured, setFeatured] = useState<Property[]>([]);
  const [fresh, setFresh] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentLogo[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    Promise.all([
      fetchProperties({ featured: "1", per_page: "6" }),
      fetchProperties({ per_page: "6", sort: "created_at", order: "desc" }),
      api.get<{ data: AgentLogo[] }>("/api/agents").catch(() => null),
      api.get<StatsData>("/api/stats").catch(() => null),
    ])
      .then(([featuredRes, freshRes, agentsRes, statsRes]) => {
        setFeatured(featuredRes.data);
        setFresh(freshRes.data);
        if (agentsRes) setAgents(agentsRes.data.data || []);
        if (statsRes) setStats(statsRes.data);
      })
      .catch(() => {
        setFeatured(properties.filter((p) => p.featured));
        setFresh(properties.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Hero */}
      <section
        className="relative flex min-h-dvh flex-col justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0A1628 0%, #1B2E4B 100%)" }}
      >
        <img
          src={heroLekki}
          alt="Civic Towers, Lekki — Lagos luxury skyline"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          loading="eager"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(10,22,40,0.85) 0%, rgba(27,46,75,0.65) 50%, rgba(10,22,40,0.55) 100%)",
          }}
        />
        <div className="absolute inset-0 opacity-30" style={{
          background: "radial-gradient(800px 400px at 20% 20%, rgba(201,168,76,0.25), transparent 60%), radial-gradient(600px 400px at 90% 80%, rgba(255,255,255,0.06), transparent 60%)"
        }} />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "#C9A84C" }} /> Verified Nigerian Property Marketplace
            </span>
            <h1 className="mt-5 font-display font-semibold leading-[0.95] text-3xl sm:text-4xl md:text-6xl lg:text-8xl">
              Homes, Lands &nbsp;&nbsp;<span style={{ fontStyle: "italic", color: "#C9A84C", fontFamily: "'Playfair Display', 'Georgia', serif" }}>&</span>&nbsp;&nbsp; Property Across Nigeria
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm text-white/85 sm:text-base md:text-lg lg:text-xl">
              Discover verified homes and land for sale or rent across Lagos, Abuja, Port Harcourt, Delta, Imo and Anambra — built for serious buyers, professional realtors and diaspora investors.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-4xl"><SearchBar /></div>
          <div className="mt-5 flex justify-center">
            <a
              href="https://tally.so/r/RGrA0p"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition hover:scale-[1.02] sm:px-6 sm:py-3 sm:text-sm"
              style={{ background: "#C9A84C", color: "#0A1628" }}
            >
              Agents & Realtors — Join the Early Access Waitlist <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Quick category tiles */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <Link key={cat.label} to="/properties" search={cat.search as never}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: cat.bg }}>
                <cat.icon className="h-6 w-6" style={{ color: cat.color }} />
              </div>
              <div>
                <div className="font-semibold text-foreground">{cat.label}</div>
                <div className="text-xs text-muted-foreground">{cat.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Browse sections */}
      <BrowseSection category="buy" />
      <BrowseSection category="rent" dark />
      <BrowseSection category="shortlet" />
      <BrowseSection category="land" />

      {/* Top stats */}
      {stats && (
        <section className="border-y border-border bg-secondary/40">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
            <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Platform Snapshot</p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard value={stats.total_properties} label="Properties Listed" icon={Home} />
              <StatCard value={stats.featured_properties} label="Featured Listings" icon={Sparkles} />
              <StatCard value={stats.total_agents} label="Active Agents" icon={Users} />
              <StatCard value={stats.cities_covered} label="Cities Covered" icon={MapPin} />
              <StatCard value={stats.total_users} label="Registered Users" icon={Heart} />
            </div>
          </div>
        </section>
      )}

      {/* Featured agents */}
      {agents.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>Partner Agents</p>
              <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Trusted real estate professionals</h2>
            </div>
            <Link to="/agents" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex">
              All agents <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            {agents.slice(0, 8).map((a) => (
              <Link key={a.id} to="/agents" className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: a.avatar_hue ? `oklch(0.45 0.1 ${a.avatar_hue})` : "oklch(0.45 0.1 200)" }}>
                  {a.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{a.agency || a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.listings} listings</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Honest banner */}
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:gap-6 sm:text-left sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">For Agents & Realtors — Early Access</p>
            <h2 className="mt-1 font-display text-xl font-semibold sm:text-2xl">Founding Member Sign-Ups Are Open</h2>
            <p className="mt-1 text-sm text-muted-foreground">A new Lagos real estate platform for realtors — free lead generation, listing tools, and training. Benefits are exclusive to early sign-ups. Takes 2 minutes.</p>
          </div>
          <a href="https://tally.so/r/RGrA0p" target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Register your interest <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>Featured</p>
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
          body="Talk directly to top-rated Lagos agents — no middleman, no spam calls." />
      </section>

      {/* City guide */}
      <section className="bg-secondary/40 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>Neighbourhood Guide</p>
          <h2 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">Explore cities across Nigeria</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CITIES.map((c) => (
              <Link key={c.name} to="/properties" search={{ city: c.name } as never}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
                <div className="aspect-[16/9] overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-br transition duration-500 group-hover:scale-105" style={{ background: c.gradient }} />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-4" style={{ background: "linear-gradient(transparent 40%, rgba(0,0,0,0.7))" }}>
                  <h3 className="font-display text-xl font-bold text-white">{c.name}</h3>
                  <p className="text-xs text-white/80">{c.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">Recently added</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fresh.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-secondary/40 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>What people say</p>
          <h2 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">Trusted by Lagos's property community</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
                <div className="flex gap-0.5 text-[#C9A84C]">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground/85">"{t.quote}"</blockquote>
                <figcaption className="mt-4 border-t border-border pt-3">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.title}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Agent recruitment */}
      <section id="for-agents" className="scroll-mt-20" style={{ background: "#0A1628" }}>
        <div className="mx-auto max-w-7xl px-4 py-12 text-white sm:px-6 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>For Agents, Realtors & Early Access Members</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-5xl">Join the Nigerian Realtor Community</h2>
            <p className="mt-3 text-base text-white/70 sm:text-lg">
              We're building a professional community for Lagos realtors — with free lead generation, listing tools, and training. We're onboarding founding members now, and the benefits are exclusive to early sign-ups. It takes 2 minutes to register your interest.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Benefit icon={<Home className="h-5 w-5" />} title="Free agent profile and verified badge"
              body="Stand out with a professional, verified listing — included free for founding agents." />
            <Benefit icon={<BarChart3 className="h-5 w-5" />} title="Free lead generation and market data"
              body="Quality enquiries from serious buyers, plus Lagos pricing and demand insights." />
            <Benefit icon={<Users className="h-5 w-5" />} title="Listing tools & realtor training"
              body="Professional tools to manage listings, plus training built for the Lagos market." />
          </div>
          <div className="mt-10 flex flex-col items-start gap-3">
            <Link to="/agent/register"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition hover:scale-[1.02]"
              style={{ background: "#C9A84C", color: "#0A1628" }}>
              Create Your Free Agent Account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/agent/login"
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-[#C9A84C] transition-colors">
              Already registered? Log in here <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Diaspora banner */}
      <section style={{ background: "linear-gradient(90deg, #C9A84C 0%, #E5C26B 100%)" }}>
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl text-[#0A1628]">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Investing in Lagos from abroad? We make it simple.</h2>
            <p className="mt-2 text-sm sm:text-base">
              <span className="inline-flex items-center gap-1.5"><Plane className="h-4 w-4" /> Virtual tours</span>
              <span className="mx-2">·</span>
              <span className="inline-flex items-center gap-1.5"><FileCheck className="h-4 w-4" /> Verified titles</span>
              <span className="mx-2">·</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Escrow-protected transactions</span>
              <span className="mx-2">·</span>
              <span className="inline-flex items-center gap-1.5"><Banknote className="h-4 w-4" /> Dollar and pound pricing</span>
            </p>
          </div>
          <Link to="/diaspora"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#0A1628] px-6 py-3 text-sm font-semibold text-white hover:opacity-90">
            Diaspora Investor Guide <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

const CATEGORIES = [
  { label: "Buy", desc: "Homes for purchase", icon: Home, search: { purpose: "buy" }, bg: "rgba(201,168,76,0.12)", color: "#C9A84C" },
  { label: "Rent", desc: "Premium rentals", icon: Search, search: { purpose: "rent" }, bg: "rgba(59,130,246,0.12)", color: "#3B82F6" },
  { label: "Shortlet", desc: "Short stays", icon: Building2, search: { purpose: "shortlet" }, bg: "rgba(16,185,129,0.12)", color: "#10B981" },
  { label: "Land", desc: "Plots & acres", icon: LandPlot, search: { type: "land" }, bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
];

const CITIES = [
  { name: "Lagos", desc: "Lekki, Ikoyi, VI, Banana Island", gradient: "linear-gradient(135deg, #0A1628, #1B2E4B)" },
  { name: "Abuja", desc: "Maitama, Wuse, Asokoro, Gwarinpa", gradient: "linear-gradient(135deg, #1a3a2a, #2d5a3e)" },
  { name: "Port Harcourt", desc: "GRA, Old GRA, Elelenwo", gradient: "linear-gradient(135deg, #3a1a1a, #5a2d2d)" },
  { name: "Ibadan", desc: "Bodija, Jericho, Ibadan North", gradient: "linear-gradient(135deg, #2a1a3a, #4a2d5a)" },
];

const TESTIMONIALS = [
  { quote: "AVR Homes gave my listings the professional presentation they deserved. I closed two deals within my first month on the platform.", name: "Chidi Okonkwo", title: "Property Consultant, Lekki" },
  { quote: "As a diaspora investor in London, I needed a platform I could trust. AVR Homes verified listings gave me the confidence to buy remotely.", name: "Adaeze M.", title: "Investor, London / Lagos" },
  { quote: "The agent dashboard is clean and professional. It finally feels like Lagos real estate is catching up with global standards.", name: "Funmi Adeyemi", title: "Senior Realtor, Victoria Island" },
];

function ValueCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Benefit({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>{icon}</div>
      <h3 className="mt-4 font-display text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm text-white/70">{body}</p>
    </div>
  );
}

function StatCard({ value, label, icon: Icon }: { value: number; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-center">
      <Icon className="mx-auto h-5 w-5 text-primary" />
      <div className="mt-2 font-display text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
