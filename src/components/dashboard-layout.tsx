import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Home, Mail, UserCircle, ShieldCheck, HelpCircle,
  Menu, X, LogOut, ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/agent/dashboard" },
  { icon: Home, label: "My Listings", to: "/agent/dashboard/listings" },
  { icon: Mail, label: "Leads", to: "/agent/dashboard/leads" },
  { icon: UserCircle, label: "Profile", to: "/agent/dashboard/profile" },
  { icon: ShieldCheck, label: "Verification", to: "/agent/dashboard/verification" },
  { icon: HelpCircle, label: "Help & Support", to: "#" },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadLeads, setUnreadLeads] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      api.get<{ unread_count: number }>("/api/agent/leads/unread-count")
        .then((r) => setUnreadLeads(r.data.unread_count))
        .catch(() => {});
    };
    fetchUnread();
    const iv = setInterval(fetchUnread, 30000);
    return () => clearInterval(iv);
  }, [user]);

  const profile = user?.profile;
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "AG";

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card pt-16 transition-transform duration-200 lg:static lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ icon: Icon, label, to }) => {
              const active = pathname === to;
              return (
                <Link key={to} to={to as any} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}>
                  <Icon className="h-4 w-4" />
                  {label}
                  <span className="ml-auto flex items-center gap-1">
                    {label === "Leads" && unreadLeads > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                        {unreadLeads > 99 ? "99+" : unreadLeads}
                      </span>
                    )}
                    {active && <ChevronRight className="h-4 w-4" />}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border p-4">
          <button onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{profile?.agency || "Agent"}</p>
            </div>
            <Avatar className="h-9 w-9">
              <AvatarFallback className={`text-xs font-medium`}
                style={{ backgroundColor: `hsl(${profile?.avatar_hue || 195}, 50%, 70%)` }}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
