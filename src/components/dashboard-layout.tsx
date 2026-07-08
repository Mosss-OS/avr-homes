/**
 * Agent dashboard layout with sidebar navigation, unread-lead badge,
 * and user info header.
 */

import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Home, Mail, UserCircle, ShieldCheck, HelpCircle, CreditCard, Users,
  Menu, LogOut, ChevronRight, FileText, PanelLeftClose, PanelLeft,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/agent/dashboard" },
  { icon: Home, label: "My Listings", to: "/agent/dashboard/listings" },
  { icon: Mail, label: "Leads", to: "/agent/dashboard/leads" },
  { icon: Users, label: "Referrals", to: "/agent/dashboard/referrals" },
  { icon: CreditCard, label: "Subscriptions", to: "/agent/dashboard/subscriptions" },
  { icon: UserCircle, label: "Profile", to: "/agent/dashboard/profile" },
  { icon: ShieldCheck, label: "Verification", to: "/agent/dashboard/verification" },
  { icon: FileText, label: "Blog", to: "/agent/dashboard/blog" },
  { icon: HelpCircle, label: "Help & Support", to: "#" },
];

/** Agent dashboard shell wrapping page content with sidebar and top header. */
export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-200 lg:sticky lg:top-0 lg:h-screen ${
        collapsed ? "w-16" : "w-64"
      } ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className={`flex h-16 items-center border-b border-border ${collapsed ? "justify-center px-0" : "gap-3 px-5"}`}>
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
          {!collapsed && <span className="font-display text-sm font-semibold">Dashboard</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ icon: Icon, label, to }) => {
              const active = pathname === to;
              return (
                <Link key={to} to={to as any} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
                    collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5"
                  } ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                  title={collapsed ? label : undefined}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <>
                      {label}
                      <span className="ml-auto flex items-center gap-1">
                        {label === "Leads" && unreadLeads > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                            {unreadLeads > 99 ? "99+" : unreadLeads}
                          </span>
                        )}
                        {active && <ChevronRight className="h-4 w-4" />}
                      </span>
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border p-3">
          <button onClick={logout}
            className={`flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-white transition-colors bg-red-600 hover:bg-red-700 ${
              collapsed ? "justify-center px-2" : "gap-3"
            }`}
            title={collapsed ? "Sign out" : undefined}>
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex text-muted-foreground hover:text-foreground transition-colors">
              {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>

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
