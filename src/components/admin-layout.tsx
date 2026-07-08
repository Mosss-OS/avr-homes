/**
 * Admin panel layout with collapsible sidebar navigation,
 * user info header, and sign-out action.
 */

import { useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Home, Users, ShieldCheck, CalendarCheck, Activity, Settings,
  Menu, X, LogOut, ChevronRight, FileText, Building2, PanelLeftClose, PanelLeft, MessageSquare,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", to: "/admin" },
  { icon: Home, label: "Properties", to: "/admin/properties" },
  { icon: Building2, label: "Agents", to: "/admin/agents" },
  { icon: Users, label: "Users", to: "/admin/users" },
  { icon: CalendarCheck, label: "Bookings", to: "/admin/bookings" },
  { icon: ShieldCheck, label: "Verifications", to: "/admin/verifications" },
  { icon: MessageSquare, label: "Inquiries", to: "/admin/inquiries" },
  { icon: FileText, label: "Blog", to: "/admin/blog" },
  { icon: Activity, label: "Activity Log", to: "/admin/activity" },
  { icon: Settings, label: "Settings", to: "/admin/settings" },
];

/** Full-screen admin shell wrapping page content with sidebar and top header. */
export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "AD";

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-[#0A1628] text-white transition-all duration-200 lg:sticky lg:top-0 lg:h-screen ${
        collapsed ? "w-16" : "w-64"
      } ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className={`flex h-16 items-center border-b border-white/10 ${collapsed ? "justify-center px-0" : "gap-3 px-5"}`}>
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#C9A84C] text-xs font-bold text-[#0A1628]">A</div>
          {!collapsed && <span className="font-display text-sm font-semibold">AVR Admin</span>}
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
                      ? "bg-[#C9A84C]/20 text-[#C9A84C]"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  title={collapsed ? label : undefined}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <>
                      {label}
                      {active && <ChevronRight className="ml-auto h-4 w-4" />}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-3">
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

      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-y-auto">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
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
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
