import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import {
  TrendingUp, MapPin, BarChart3, ArrowLeft, Loader2, DollarSign,
  Building2, PieChart, ShieldCheck, CalendarDays, CheckCircle2, Percent,
  Users, Clock, AlertCircle, Heart, Share2, LandPlot,
} from "lucide-react";

export const Route = createFileRoute("/invest/$id")({
  component: InvestDetail,
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
  property_description: string | null;
  city: string | null;
  state: string | null;
  property_image: string | null;
  property_price: number | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  property_type: string | null;
  property_details: Record<string, any> | null;
  dividends: Dividend[];
}

interface Dividend {
  id: number;
  amount_per_share: number;
  total_amount: number;
  declared_at: string;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string;
}

function InvestDetail() {
  const { id } = Route.useParams();
  const [item, setItem] = useState<InvestmentProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState(100);
  const [showKyc, setShowKyc] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<InvestmentProperty>(`/api/investments/${id}`)
      .then((r) => setItem(r.data))
      .catch(() => {
        // Fallback for demo
        const fallbacks = [
          {
            id: 1, property_id: null,
            title: "Eko Atlantic Luxury Tower",
            description: "Premium beachfront residential tower in Eko Atlantic City. Fractional ownership of luxury studio apartments with guaranteed rental income. The tower features 24/7 security, concierge service, rooftop infinity pool, gym, and private parking. Each unit is fully managed and rented to corporate executives and expatriates.",
            image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
            total_shares: 10000, share_price: 15000, available_shares: 3200,
            min_investment: 150000, expected_yield: 12.5, distribution_frequency: "quarterly",
            status: "active", funding_percentage: 68,
            property_title: "Eko Atlantic Luxury Studio", property_description: null,
            city: "Eko Atlantic", state: "Lagos", property_image: null,
            property_price: 85000000, beds: 1, baths: 1, area: 55, property_type: "apartment",
            property_details: {
              year_built: 2024, floors: 18, units: 120,
              amenities: ["Pool", "Gym", "Concierge", "Security", "Parking"],
            },
            dividends: [
              { id: 1, amount_per_share: 420, total_amount: 4200000, declared_at: "2026-06-15T00:00:00Z", paid_at: "2026-07-01T00:00:00Z", period_start: "2026-04-01", period_end: "2026-06-30", status: "paid" },
            ],
          },
        ];
        const found = fallbacks.find((f) => f.id === Number(id));
        if (found) setItem(found);
        else throw notFound();
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    api.get<{ status: string }>("/api/kyc/status")
      .then((r) => setKycStatus(r.data.status))
      .catch(() => {});
  }, []);

  async function handleBuy() {
    if (!kycStatus || kycStatus !== "verified") {
      setShowKyc(true);
      return;
    }
    setPurchasing(true);
    try {
      await api.post("/api/investments/buy", {
        investment_property_id: Number(id),
        shares,
      });
      alert("Investment successful!");
      setItem((prev) => prev ? { ...prev, available_shares: prev.available_shares - shares } : prev);
    } catch (e: any) {
      alert(e.message || "Purchase failed");
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) return null;

  const totalInvestment = shares * item.share_price;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link to="/invest" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to opportunities
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Left: Details */}
        <div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
            <img src={item.image || item.property_image || ""} alt={item.title} className="h-full w-full object-cover" />
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="mr-1 inline h-3 w-3" />{item.expected_yield}% Annual Yield
              </span>
              {item.city && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {item.city}
                </span>
              )}
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary capitalize">
                {item.distribution_frequency.replace("_", " ")} Distributions
              </span>
            </div>

            <h1 className="font-display text-3xl font-semibold">{item.title}</h1>
            <p className="mt-3 leading-relaxed text-foreground/80">{item.description}</p>

            {/* Property details */}
            {item.property_details && (
              <div className="mt-6 rounded-2xl border border-border bg-card p-5">
                <h2 className="font-display text-lg font-semibold mb-4">Property Details</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {item.property_type && (
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="text-sm font-medium capitalize">{item.property_type}</p>
                    </div>
                  )}
                  {item.beds && (
                    <div>
                      <p className="text-xs text-muted-foreground">Bedrooms</p>
                      <p className="text-sm font-medium">{item.beds}</p>
                    </div>
                  )}
                  {item.baths && (
                    <div>
                      <p className="text-xs text-muted-foreground">Bathrooms</p>
                      <p className="text-sm font-medium">{item.baths}</p>
                    </div>
                  )}
                  {item.area && (
                    <div>
                      <p className="text-xs text-muted-foreground">Area</p>
                      <p className="text-sm font-medium">{item.area} sqm</p>
                    </div>
                  )}
                </div>
                {item.property_details.amenities && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {item.property_details.amenities.map((a: string) => (
                        <span key={a} className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dividend History */}
            {item.dividends.length > 0 && (
              <div className="mt-6 rounded-2xl border border-border bg-card p-5">
                <h2 className="font-display text-lg font-semibold mb-4">Dividend History</h2>
                <div className="space-y-3">
                  {item.dividends.map((d) => (
                    <div key={d.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">₦{d.amount_per_share.toLocaleString()} per share</p>
                        {d.period_start && d.period_end && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(d.period_start).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                            {" — "}
                            {new Date(d.period_end).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        d.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      }`}>
                        {d.status === "paid" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {d.status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Investment card */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Share Price</p>
                <p className="font-display text-2xl font-bold">₦{item.share_price.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-xl font-bold text-emerald-600">{item.available_shares.toLocaleString()}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Funding Progress</span>
                <span>{item.funding_percentage}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${item.funding_percentage}%` }} />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Number of Shares</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShares(Math.max(1, shares - 10))}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border text-sm font-medium hover:bg-secondary transition"
                  >-</button>
                  <input type="number" value={shares}
                    onChange={(e) => setShares(Math.max(1, Math.min(Number(e.target.value) || 1, item.available_shares)))}
                    className="h-8 w-20 rounded-lg border border-border bg-background text-center text-sm font-medium outline-none"
                    min={1} max={item.available_shares} />
                  <button onClick={() => setShares(Math.min(item.available_shares, shares + 10))}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border text-sm font-medium hover:bg-secondary transition"
                  >+</button>
                </div>
              </div>
              {item.min_investment && totalInvestment < item.min_investment && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Minimum investment: ₦{item.min_investment.toLocaleString()}
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Investment Amount</span>
                <span className="font-semibold">₦{totalInvestment.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. Quarterly Return</span>
                <span className="font-semibold text-emerald-600">
                  ₦{Math.round(totalInvestment * (item.expected_yield || 0) / 100 / 4).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. Annual Return</span>
                <span className="font-semibold text-emerald-600">
                  ₦{Math.round(totalInvestment * (item.expected_yield || 0) / 100).toLocaleString()}
                </span>
              </div>
            </div>

            {showKyc && (!kycStatus || kycStatus !== "verified") && (
              <div className="rounded-xl bg-amber-500/10 p-3 text-sm">
                <p className="font-medium text-amber-700 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> KYC Required
                </p>
                <p className="mt-1 text-amber-600/80 text-xs">
                  Complete identity verification to start investing.
                </p>
                <Link to="/kyc" className="mt-2 inline-flex rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                  Complete KYC
                </Link>
              </div>
            )}

            {kycStatus === "pending" && (
              <div className="rounded-xl bg-blue-500/10 p-3 text-sm">
                <p className="font-medium text-blue-700">KYC Under Review</p>
                <p className="mt-1 text-blue-600/80 text-xs">Your documents are being verified.</p>
              </div>
            )}

            <button onClick={handleBuy} disabled={purchasing || item.status !== "active"}
              className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              {purchasing ? "Processing..." : item.status === "fully_funded" ? "Fully Funded" : "Invest Now"}
            </button>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Secured investment</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Fractional ownership</span>
              <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Track returns</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
