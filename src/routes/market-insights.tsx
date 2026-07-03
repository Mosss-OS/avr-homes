import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api-client";
import { Loader2, TrendingUp, TrendingDown, MapPin, Home, DollarSign, BarChart3, Download, ChevronLeft, ChevronRight, Calendar, Filter, FileText } from "lucide-react";

export const Route = createFileRoute("/market-insights")({
  head: () => ({
    meta: [
      { title: "Lagos Property Market Insights — AVR Homes" },
      { name: "description", content: "Quarterly Lagos property price index, neighborhood heatmaps, rental yields, and market reports. Data-driven insights for investors and agents." },
    ],
  }),
  component: MarketInsightsPage,
});

interface PriceIndexData {
  city: string;
  property_type: string | null;
  purpose: string;
  current_avg_price: number;
  current_yield: number;
  total_samples: number;
  index_history: { period: string; index_value: number; change_pct: number | null; samples: number }[];
}

interface HeatmapData {
  community: string;
  avg_price: number;
  avg_rent: number;
  yield: number;
  sample_size: number;
  property_type: string;
  lat: number;
  lng: number;
}

interface MarketReport {
  id: number;
  period: string;
  pdf_url: string;
  highlights: string[];
  published_at: string;
}

function MarketInsightsPage() {
  const [priceIndex, setPriceIndex] = useState<PriceIndexData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData[]>([]);
  const [reports, setReports] = useState<{ data: any[]; total: number }>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({
    city: "Lagos",
    type: "",
    purpose: "buy",
  });
  const [activeTab, setActiveTab] = useState<"index" | "heatmap" | "reports">("index");
  const [reportPage, setReportPage] = useState(1);

  useEffect(() => {
    loadAllData();
  }, [filters, reportPage]);

  async function loadAllData() {
    try {
      setLoading(true);
      const [indexRes, heatmapRes, reportsRes] = await Promise.all([
        api.get<PriceIndexData>(`/api/market/price-index?city=${filters.city}&type=${filters.type}&purpose=${filters.purpose}`),
        api.get<HeatmapData[]>(`/api/market/heatmap?city=${filters.city}&type=${filters.type}&purpose=${filters.purpose}`),
        api.get<{ data: any[]; total: number }>(`/api/market/reports?page=${reportPage}&per_page=10`),
      ]);
      setPriceIndex(indexRes.data);
      setHeatmap(heatmapRes.data);
      setReports(reportsRes.data);
    } catch {
      setError("Failed to load market data");
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-NG').format(num);
  };

  const formatPct = (pct: number | null) => {
    if (pct === null) return "—";
    return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
              <BarChart3 className="h-3.5 w-3.5" /> Lagos Property Market Intelligence
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] sm:text-5xl">
              Data-Driven Insights for <span className="text-primary">Lagos Real Estate</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Quarterly price index, neighborhood heatmaps, rental yields, and downloadable market reports.
              Powered by live transaction data across Lekki, Ikoyi, Victoria Island, Eko Atlantic, and Banana Island.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                <Calendar className="h-4 w-4" />
                Latest: {priceIndex?.index_history[priceIndex.index_history.length - 1]?.period ?? "Q1 2024"}
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium">
                {formatNumber(priceIndex?.total_samples ?? 0)} properties analyzed
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="Lagos">Lagos</option>
              <option value="Abuja">Abuja</option>
            </select>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Property Types</option>
              <option value="apartment">Apartment</option>
              <option value="villa">Villa</option>
              <option value="townhouse">Townhouse</option>
              <option value="penthouse">Penthouse</option>
              <option value="studio">Studio</option>
            </select>
            <select
              value={filters.purpose}
              onChange={(e) => setFilters({ ...filters, purpose: e.target.value })}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="buy">For Sale</option>
              <option value="rent">For Rent</option>
            </select>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      {priceIndex && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              icon={Home}
              label="Avg Price"
              value={formatCurrency(priceIndex.current_avg_price)}
              subtitle={`${formatNumber(priceIndex.total_samples)} samples`}
              color="primary"
            />
            <KPICard
              icon={TrendingUp}
              label="Rental Yield"
              value={`${priceIndex.current_yield.toFixed(1)}%`}
              subtitle="Gross annual yield"
              color="emerald"
            />
            <KPICard
              icon={DollarSign}
              label="QoQ Change"
              value={formatPct(priceIndex.index_history.length > 1 ? priceIndex.index_history[priceIndex.index_history.length - 1].change_pct : null)}
              subtitle="vs previous quarter"
              color={priceIndex.index_history.length > 1 && (priceIndex.index_history[priceIndex.index_history.length - 1].change_pct ?? 0) >= 0 ? "emerald" : "destructive"}
            />
            <KPICard
              icon={BarChart3}
              label="Data Points"
              value={formatNumber(priceIndex.total_samples)}
              subtitle="Verified transactions"
              color="amber"
            />
          </div>
        </section>
      )}

      {/* Tabs */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1 mb-6">
          {[
            { id: "index", label: "Price Index", icon: TrendingUp },
            { id: "heatmap", label: "Neighborhood Heatmap", icon: MapPin },
            { id: "reports", label: "Market Reports", icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                activeTab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}>
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "index" && priceIndex && (
          <PriceIndexChart data={priceIndex.index_history} />
        )}

        {activeTab === "heatmap" && (
          <HeatmapView data={heatmap} />
        )}

        {activeTab === "reports" && (
          <ReportsList reports={reports.data} total={reports.total} page={reportPage} onPageChange={setReportPage} />
        )}
      </section>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, subtitle, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; subtitle: string; color: string }) {
  const colors = {
    primary: "bg-primary/10 text-primary border-primary/20",
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  };
  return (
    <div className={`rounded-2xl border p-5 shadow-[var(--shadow-card)] ${colors[color as keyof typeof colors]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold">{value}</p>
        </div>
        <div className="rounded-xl p-2">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function PriceIndexChart({ data }: { data: { period: string; index_value: number; change_pct: number | null; samples: number }[] }) {
  const maxValue = Math.max(...data.map(d => d.index_value));
  const minValue = Math.min(...data.map(d => d.index_value));
  const range = maxValue - minValue || 1;

  // Compute SVG paths
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 580,
    y: 280 - ((d.index_value - minValue) / range) * 280,
    period: d.period,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath + ` L 580 280 L 0 280 Z`;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="mb-6">
        <h3 className="font-display text-xl font-semibold">Quarterly Price Index</h3>
        <p className="mt-1 text-sm text-muted-foreground">Average price per property over time</p>
      </div>
      
      <div className="h-80 relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-12 w-24 flex flex-col justify-between pr-4 text-right text-xs text-muted-foreground">
          {[maxValue, maxValue * 0.75 + minValue * 0.25, maxValue * 0.5 + minValue * 0.5, maxValue * 0.25 + minValue * 0.75, minValue].map((val, i) => (
            <div key={i} className="h-1/5 flex items-end">
              <span>₦{(val / 1e9).toFixed(1)}B</span>
            </div>
          ))}
        </div>
        
        {/* Chart area */}
        <div className="absolute left-24 right-4 top-0 bottom-12">
          <svg className="h-full w-full" viewBox="0 0 600 300" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1="0"
                y1={ratio * 280}
                x2="580"
                y2={ratio * 280}
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />
            ))}
            
            {/* Area under curve */}
            <path
              d={areaPath}
              fill="url(#gradient)"
              opacity="0.3"
            />
            
            {/* Line */}
            <path
              d={linePath}
              stroke="#3b82f6"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Data points */}
            {data.map((d, i) => {
              const x = (i / (data.length - 1)) * 580;
              const y = 280 - ((d.index_value - Math.min(...data.map(d => d.index_value))) / range) * 280;
              return (
                <g key={d.period}>
                  <circle
                    cx={x}
                    cy={y}
                    r="5"
                    fill="#3b82f6"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text x={x} y={295} textAnchor="middle" fontSize="10" fill="#9ca3af">{d.period}</text>
                </g>
              );
            })}
            
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-24 right-4 h-12 flex items-start justify-between px-2 text-xs text-muted-foreground">
          {data.map((d) => (
            <div key={d.period} className="flex-1 text-center">
              {d.period}
            </div>
          ))}
        </div>
      </div>
      
      {/* Summary Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Period</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg Price</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Change</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Samples</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.slice().reverse().map((d) => (
              <tr key={d.period} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{d.period}</td>
                <td className="px-4 py-3 text-right font-medium">₦{(d.index_value / 1e9).toFixed(2)}B</td>
                <td className="px-4 py-3 text-right">
                  <span className={d.change_pct === null ? "text-muted-foreground" : d.change_pct! >= 0 ? "text-emerald-600" : "text-destructive"}>
                    {d.change_pct === null ? "—" : `${d.change_pct! >= 0 ? '+' : ''}${d.change_pct!.toFixed(1)}%`}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">{d.samples.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeatmapView({ data }: { data: HeatmapData[] }) {
  const maxPrice = Math.max(...data.map(d => d.avg_price));
  const minPrice = Math.min(...data.map(d => d.avg_price));
  
  const getColor = (price: number) => {
    const ratio = (price - minPrice) / (maxPrice - minPrice || 1);
    const hue = 120 - ratio * 120; // Green to Red
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="mb-6">
        <h3 className="font-display text-xl font-semibold">Neighborhood Price Heatmap</h3>
        <p className="mt-1 text-sm text-muted-foreground">Average price per property by community (darker = higher price)</p>
      </div>
      
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((area) => (
          <div
            key={area.community}
            className="relative rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow group"
            style={{ borderLeft: `4px solid ${getColor(area.avg_price)}` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">{area.community}</h4>
                <p className="text-xs text-muted-foreground">{area.property_type} · {area.purpose === 'buy' ? 'For Sale' : 'For Rent'}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{area.sample_size} samples</span>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg Price</span>
                <span className="font-bold">₦{(area.avg_price / 1e9).toFixed(2)}B</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${((area.avg_price - minPrice) / (maxPrice - minPrice || 1)) * 100}%`, backgroundColor: getColor(area.avg_price) }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Yield: {area.yield.toFixed(1)}%</span>
                <span>Rent: ₦{(area.avg_rent / 1e6).toFixed(0)}M/yr</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-8 flex items-center gap-4 text-xs text-muted-foreground">
        <span>Price Range:</span>
        <div className="flex-1 h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" />
        <span>₦{(minPrice / 1e9).toFixed(1)}B → ₦{(maxPrice / 1e9).toFixed(1)}B</span>
      </div>
    </div>
  );
}

function ReportsList({ reports, total, page, onPageChange }: { reports: MarketReport[]; total: number; page: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.ceil(total / 10);

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="font-medium">No market reports published yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Admin can publish quarterly PDF reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
      
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function ReportCard({ report }: { report: MarketReport }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-display text-lg font-semibold">Lagos Property Market Report</h4>
            <p className="text-sm text-muted-foreground">{report.period} · Published {new Date(report.published_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {report.highlights.slice(0, 3).map((h, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hidden sm:inline-flex">
              {h}
            </span>
          ))}
          <a
            href={report.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      </div>
      {report.highlights.length > 3 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {report.highlights.slice(3).join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}