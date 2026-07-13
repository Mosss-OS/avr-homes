import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import {
  TrendingUp, MapPin, Building2, Percent, Loader2, BadgeCheck,
  BarChart3, ArrowRight, DollarSign, PieChart, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/invest")({
  component: InvestMarketplace,
});

interface InvestmentProperty {
  id: number;
  property_id: number | null;
  title: string;
  description: string | null;
  image: string | null;
  total_shares: number;
  share_price: number;
  available_shares: number;
  min_investment: number | null;
  expected_yield: number | null;
  distribution_frequency: string;
  status: string;
  funding_percentage: number;
  property_title: string | null;
  city: string | null;
  property_image: string | null;
}

const FALLBACK_OPPORTUNITIES: InvestmentProperty[] = [
  {
    id: 1, property_id: null,
    title: "Eko Atlantic Luxury Tower",
    description: "Premium beachfront residential tower in Eko Atlantic City. Fractional ownership of luxury studio apartments with guaranteed rental income.",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
    total_shares: 10000, share_price: 15000, available_shares: 3200,
    min_investment: 150000, expected_yield: 12.5, distribution_frequency: "quarterly",
    status: "active", funding_percentage: 68, property_title: null, city: "Eko Atlantic", property_image: null,
  },
  {
    id: 2, property_id: null,
    title: "Lekki Phase 1 Villa Portfolio",
    description: "A portfolio of 4 luxury villas in Lekki Phase 1, managed and rented to high-net-worth tenants with 95% occupancy rate.",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    total_shares: 25000, share_price: 8500, available_shares: 10500,
    min_investment: 85000, expected_yield: 9.8, distribution_frequency: "quarterly",
    status: "active", funding_percentage: 58, property_title: null, city: "Lekki", property_image: null,
  },
  {
    id: 3, property_id: null,
    title: "Ikoyi Commercial Development",
    description: "Mixed-use commercial development in Ikoyi with office spaces and retail outlets. Long-term leases to multinational tenants.",
    image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800",
    total_shares: 50000, share_price: 5000, available_shares: 500,
    min_investment: 50000, expected_yield: 15.2, distribution_frequency: "semi_annual",
    status: "active", funding_percentage: 99, property_title: null, city: "Ikoyi", property_image: null,
  },
  {
    id: 4, property_id: null,
    title: "Victoria Island Luxury Apartments",
    description: "Two fully furnished luxury apartments in the heart of Victoria Island. Managed short-let operations with premium nightly rates.",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
    total_shares: 15000, share_price: 12000, available_shares: 8700,
    min_investment: 120000, expected_yield: 11.0, distribution_frequency: "monthly",
    status: "active", funding_percentage: 42, property_title: null, city: "Victoria Island", property_image: null,
  },
  {
    id: 5, property_id: null,
    title: "Banana Island Waterfront Estate",
    description: "Exclusive waterfront plots with approved building plans in Banana Island. Fractional ownership of Nigeria's most prestigious address.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    total_shares: 8000, share_price: 25000, available_shares: 6000,
    min_investment: 250000, expected_yield: 18.0, distribution_frequency: "annual",
    status: "active", funding_percentage: 25, property_title: null, city: "Banana Island", property_image: null,
  },
  {
    id: 6, property_id: null,
    title: "Ikeja Business District Hub",
    description: "Commercial property in Ikeja's business district with stable income from co-working spaces and retail outlets.",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
    total_shares: 20000, share_price: 7500, available_shares: 0,
    min_investment: 75000, expected_yield: 10.5, distribution_frequency: "quarterly",
    status: "fully_funded", funding_percentage: 100, property_title: null, city: "Ikeja", property_image: null,
  },
];

function InvestMarketplace() {
  const [opportunities, setOpportunities] = useState<InvestmentProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<InvestmentProperty[]>("/api/investments/opportunities")
      .then((r) => setOpportunities(r.data || []))
      .catch(() => setOpportunities(FALLBACK_OPPORTUNITIES))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0A1628] to-[#1a2a4a] p-8 sm:p-12 text-white mb-10">
        <div className="flex items-center gap-2 text-[#C9A84C] text-sm font-semibold uppercase tracking-wider mb-3">
          <PieChart className="h-4 w-4" /> Fractional Investment
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold leading-tight">
          Own Lagos Real Estate,<br />
          <span className="text-[#C9A84C]">One Share at a Time</span>
        </h1>
        <p className="mt-4 max-w-2xl text-white/70 text-lg">
          Invest in premium Lagos properties from as little as ₦50,000. Earn quarterly dividends
          from rental income and benefit from property appreciation.
        </p>
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Secured &amp; Verified</div>
          <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-400" /> 9–18% Annual Yield</div>
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-400" /> Premium Lagos Assets</div>
        </div>
      </div>

      {/* Stats */}
      {!loading && opportunities.length > 0 && (
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">{opportunities.length}</p>
            <p className="text-xs text-muted-foreground">Active Opportunities</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">
              {opportunities.reduce((s, o) => s + o.total_shares * o.share_price, 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">NGN</span>
            </p>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">
              {Math.round(opportunities.reduce((s, o) => s + o.funding_percentage, 0) / opportunities.length)}%
            </p>
            <p className="text-xs text-muted-foreground">Avg Funded</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">
              {Math.max(...opportunities.map((o) => o.expected_yield || 0))}%
            </p>
            <p className="text-xs text-muted-foreground">Highest Yield</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((op) => (
            <Link
              key={op.id}
              to="/invest/$id"
              params={{ id: String(op.id) }}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <img src={op.image || op.property_image || ""} alt={op.title} loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-sm font-semibold text-white">{op.title}</p>
                  {op.city && <p className="flex items-center gap-1 text-xs text-white/70"><MapPin className="h-3 w-3" /> {op.city}</p>}
                </div>
                {op.status === "fully_funded" && (
                  <div className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white">
                    Fully Funded
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Per Share</p>
                    <p className="font-display text-xl font-bold">₦{op.share_price.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Annual Yield</p>
                    <p className="flex items-center gap-1 text-lg font-bold text-emerald-600">
                      <TrendingUp className="h-4 w-4" /> {op.expected_yield}%
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{op.funding_percentage}% funded</span>
                    <span>{op.available_shares.toLocaleString()} shares left</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${op.funding_percentage}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" /> Min ₦{(op.min_investment || op.share_price).toLocaleString()}</span>
                  <span className="inline-flex items-center gap-1"><BarChart3 className="h-3 w-3" /> {op.distribution_frequency}</span>
                </div>
                <div className="flex items-center justify-center gap-1 rounded-xl bg-primary/5 py-2 text-xs font-semibold text-primary group-hover:bg-primary/10 transition">
                  View Opportunity <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
