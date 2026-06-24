import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/lib/auth-context";
import { UserCircle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/agent/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile Settings — AVR Homes" }] }),
  component: AgentProfilePage,
});

function AgentProfilePage() {
  const { user } = useAuth();
  const profile = user?.profile;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Profile Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your agent profile and public information</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold"
            style={{ backgroundColor: `hsl(${profile?.avatar_hue || 195}, 50%, 70%)` }}>
            {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{profile?.agency || "AVR Homes"}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Email", user?.email],
            ["Phone", profile?.phone],
            ["Agent ID", profile?.agent_id],
            ["Verification", profile?.is_verified ? "Verified" : "Unverified"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-accent/50 p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-medium">{value || "—"}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Full profile editing coming soon. For now, update your profile via the{" "}
          <Link to="/agent/dashboard" className="text-primary hover:underline">dashboard</Link>.
        </p>
      </div>
    </DashboardLayout>
  );
}
