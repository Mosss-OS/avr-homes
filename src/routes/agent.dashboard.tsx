/**
 * Agent dashboard overview route — displays summary statistics,
 * quick action links, and a recent activity feed for the logged-in agent.
 */

import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Home, Mail, ShieldCheck, BarChart3, Loader2, Clock } from "lucide-react";

export const Route = createFileRoute("/agent/dashboard")({
  head: () => ({
    meta: [
      { title: "Agent Dashboard — AVR Homes" },
      { name: "description", content: "Manage your property listings and leads." },
    ],
  }),
  component: AgentDashboardPage,
});

/** Aggregated listing and lead counts for the dashboard overview. */
interface DashboardStats {
  active_listings: number;
  draft_listings: number;
  archived_listings: number;
  unread_leads: number;
  total: number;
}

/** Dashboard overview page component — shows stat cards, quick actions, and activity. */
function AgentDashboardPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/agent/login" });
  }, [user, isLoading, navigate]);

  useEffect(() => {
    api.get<DashboardStats>("/api/agent/listings/stats")
      .then((res) => setStats(res.data))
      .catch(() => setError("Failed to load stats"));
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  const cards = [
    { icon: Home, label: "Active Listings", value: stats?.active_listings ?? 0, color: "bg-blue-500/10 text-blue-600" },
    { icon: Mail, label: "Unread Leads", value: stats?.unread_leads ?? 0, color: "bg-amber-500/10 text-amber-600" },
    { icon: ShieldCheck, label: "Draft Listings", value: stats?.draft_listings ?? 0, color: "bg-purple-500/10 text-purple-600" },
    { icon: BarChart3, label: "Total Listings", value: stats?.total ?? 0, color: "bg-emerald-500/10 text-emerald-600" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {user.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="mt-8 space-y-4">
        <h2 className="font-semibold">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <a href="/agent/dashboard/listings"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
            <Home className="h-4 w-4" /> Manage Listings
          </a>
          <a href="/agent/dashboard/leads"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
            <Mail className="h-4 w-4" /> View Leads
          </a>
          <a href="/agent/dashboard/profile"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
            <BarChart3 className="h-4 w-4" /> Edit Profile
          </a>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Recent Activity</h2>
        </div>
        <p className="py-8 text-center text-sm text-muted-foreground">
          Activity feed coming soon
        </p>
      </div>
    </DashboardLayout>
  );
}
