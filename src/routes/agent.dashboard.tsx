import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Building2, Home, Mail, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/agent/dashboard")({
  head: () => ({
    meta: [
      { title: "Agent Dashboard — AVR Homes" },
      { name: "description", content: "Manage your property listings and leads." },
    ],
  }),
  component: AgentDashboardPage,
});

function AgentDashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/agent/login" });
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const profile = user.profile;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Welcome, {user.name}</h1>
          <p className="text-sm text-muted-foreground">{profile?.agency || "AVR Homes"} — Agent Dashboard</p>
        </div>
        <Button variant="outline" onClick={logout} className="rounded-full text-sm">Sign out</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Home, label: "My Listings", value: "0" },
          { icon: Mail, label: "Leads", value: "0" },
          { icon: Building2, label: "Properties", value: "0" },
          { icon: BarChart3, label: "Views", value: "—" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label}
            className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-semibold">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button className="rounded-full">
            <Home className="mr-2 h-4 w-4" /> Manage Listings
          </Button>
          <Button variant="outline" className="rounded-full">
            <Mail className="mr-2 h-4 w-4" /> View Leads
          </Button>
          <Button variant="outline" className="rounded-full">
            <Building2 className="mr-2 h-4 w-4" /> Add Property
          </Button>
        </div>
      </div>
    </div>
  );
}
