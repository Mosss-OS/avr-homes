import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { Loader2, TrendingUp, BarChart3, PieChart, Building2, CalendarDays } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

const COLORS = ["#C9A84C", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

interface TrendPoint { date: string; new_users: number; new_properties: number; new_bookings: number; new_inquiries: number; new_referrals: number; new_subscriptions: number; }
interface Breakdown { properties_by_type: { type: string; count: number }[]; properties_by_purpose: { purpose: string; count: number }[]; properties_by_city: { city: string; count: number }[]; subscriptions_by_tier: { tier: string; count: number }[]; bookings_by_status: { status: string; count: number }[]; inquiries_by_status: { status: string; count: number }[]; }

function AdminAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState(30);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) { navigate({ to: "/admin/login" }); return; }
    setLoading(true);
    Promise.all([
      api.get<{ data: TrendPoint[] }>(`/api/admin/analytics/trends?period=${period}`),
      api.get<Breakdown>("/api/admin/analytics/breakdown"),
    ]).then(([t, b]) => { setTrends(t.data.data); setBreakdown(b.data); })
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [period]);

  const metrics = [
    { key: "new_users", label: "New Users", color: "#3B82F6" },
    { key: "new_properties", label: "New Properties", color: "#C9A84C" },
    { key: "new_bookings", label: "New Bookings", color: "#10B981" },
    { key: "new_inquiries", label: "Inquiries", color: "#F59E0B" },
    { key: "new_referrals", label: "Referrals", color: "#8B5CF6" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-border bg-background p-3 shadow-lg text-xs">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  const totals = trends.length > 0 ? trends.reduce((acc: Record<string, number>, d: any) => {
    metrics.forEach(m => { acc[m.key] = (acc[m.key] || 0) + Number(d[m.key]); });
    return acc;
  }, {}) : {};

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Platform trends and breakdowns</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {Object.keys(totals).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {metrics.map((m) => (
                <div key={m.key} className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">{m.label}</div>
                  <p className="text-2xl font-semibold">{totals[m.key] || 0}</p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-base font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" /> Growth Trends
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip content={<CustomTooltip />} />
                  {metrics.map((m) => (
                    <Area key={m.key} type="monotone" dataKey={m.key} name={m.label} stroke={m.color} fill={m.color} fillOpacity={0.1} strokeWidth={2} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {breakdown && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-base font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" /> Purpose
                </h2>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={breakdown.properties_by_purpose} dataKey="count" nameKey="purpose" cx="50%" cy="50%" outerRadius={80} label={({ purpose, count }: any) => `${purpose}: ${count}`}>
                        {breakdown.properties_by_purpose.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-base font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-muted-foreground" /> Property Types
                </h2>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdown.properties_by_type}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="type" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-base font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" /> Booking Status
                </h2>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={breakdown.bookings_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }: any) => `${status}: ${count}`}>
                        {breakdown.bookings_by_status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-base font-semibold mb-4 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" /> Top Cities
                </h2>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdown.properties_by_city} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="city" type="category" tick={{ fontSize: 11 }} width={80} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-base font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-muted-foreground" /> Subscriptions
                </h2>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={breakdown.subscriptions_by_tier} dataKey="count" nameKey="tier" cx="50%" cy="50%" outerRadius={80} label={({ tier, count }: any) => `${tier}: ${count}`}>
                        {breakdown.subscriptions_by_tier.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-base font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" /> Inquiry Status
                </h2>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdown.inquiries_by_status}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
