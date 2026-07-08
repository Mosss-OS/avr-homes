/**
 * Admin layout route. Renders either the login page (unauthenticated),
 * the admin dashboard (at /admin root), or nested child routes
 * (e.g. /admin/properties) wrapped in the AdminLayout shell.
 */
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin-layout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState } from "react";
import {
  Home, Users, ShieldCheck, CalendarCheck, MessageSquare, FileText, Building2,
  TrendingUp, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminRouteLayout,
});

/**
 * Top-level layout component for the /admin route.
 * - Not authenticated -> renders login Outlet
 * - Authenticated as admin/superadmin -> renders <AdminLayout> with dashboard or nested Outlet
 */
function AdminRouteLayout() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoginPage = pathname === "/admin/login";
  const isRootAdmin = pathname === "/admin";
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isLoading) setAuthChecked(true);
  }, [isLoading]);

  if (!authChecked) return null;

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    if (!isLoginPage) {
      navigate({ to: "/admin/login" });
      return null;
    }
    return <Outlet />;
  }

  return (
    <AdminLayout>
      {isRootAdmin ? <AdminDashboard /> : <Outlet />}
    </AdminLayout>
  );
}

/** Aggregate platform statistics returned by the admin/stats endpoint. */
interface Stats {
  properties: { total: number; active: number };
  agents: { total: number; verified: number };
  users: { total: number };
  verifications: { pending: number };
  bookings: { total: number; pending: number };
  inquiries: { total: number; unread: number };
  blog_posts: { total: number };
}

/** Dashboard overview page. Fetches platform stats and renders stat cards + quick links. */
function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  /* Fetch aggregate stats on mount */
  useEffect(() => {
    api.get<Stats>("/api/admin/stats")
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Stat card definitions — each card has an icon, label, value, subtitle, and colour scheme */
  const cards = [
    { icon: Home, label: "Properties", value: stats?.properties.active ?? 0, sub: `${stats?.properties.total ?? 0} total`, color: "text-blue-600", bg: "bg-blue-100" },
    { icon: Building2, label: "Agents", value: stats?.agents.total ?? 0, sub: `${stats?.agents.verified ?? 0} verified`, color: "text-emerald-600", bg: "bg-emerald-100" },
    { icon: Users, label: "Users", value: stats?.users.total ?? 0, sub: "registered users", color: "text-violet-600", bg: "bg-violet-100" },
    { icon: ShieldCheck, label: "Verifications", value: stats?.verifications.pending ?? 0, sub: "pending review", color: "text-amber-600", bg: "bg-amber-100" },
    { icon: CalendarCheck, label: "Bookings", value: stats?.bookings.total ?? 0, sub: `${stats?.bookings.pending ?? 0} pending`, color: "text-rose-600", bg: "bg-rose-100" },
    { icon: MessageSquare, label: "Inquiries", value: stats?.inquiries.total ?? 0, sub: `${stats?.inquiries.unread ?? 0} unread`, color: "text-cyan-600", bg: "bg-cyan-100" },
    { icon: FileText, label: "Blog Posts", value: stats?.blog_posts.total ?? 0, sub: "published", color: "text-orange-600", bg: "bg-orange-100" },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Welcome back, {user?.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's what's happening on the platform.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map(({ icon: Icon, label, value, sub, color, bg }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${bg} ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">{sub}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Quick Actions</h2>
          <div className="mt-4 grid gap-2">
            <QuickLink to="/admin/properties" label="Manage Properties" />
            <QuickLink to="/admin/verifications" label="Review Verification Requests" />
            <QuickLink to="/admin/agents" label="Manage Agents" />
            <QuickLink to="/admin/bookings" label="View Bookings" />
            <QuickLink to="/admin/activity" label="View Activity Log" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">System</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between rounded-lg bg-secondary/60 px-3 py-2">
              <span className="text-muted-foreground">Your Role</span>
              <span className="font-medium capitalize">{user?.role}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-secondary/60 px-3 py-2">
              <span className="text-muted-foreground">Logged in as</span>
              <span className="font-medium">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** A single quick-action link rendered inside the Dashboard sidebar card. */
function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <a href={to} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-secondary transition">
      {label}
      <TrendingUp className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}
