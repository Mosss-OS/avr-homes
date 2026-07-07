import { useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Home, Users, ShieldCheck, CalendarCheck, Activity, Settings,
  Menu, X, LogOut, ChevronRight, FileText, Building2,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", to: "/admin" },
  { icon: Home, label: "Properties", to: "/admin/properties" },
  { icon: Building2, label: "Agents", to: "/admin/agents" },
  { icon: Users, label: "Users", to: "/admin/users" },
  { icon: CalendarCheck, label: "Bookings", to: "/admin/bookings" },
  { icon: ShieldCheck, label: "Verifications", to: "/admin/verifications" },
  { icon: FileText, label: "Blog", to: "/admin/blog" },
  { icon: Activity, label: "Activity Log", to: "/admin/activity" },
  { icon: Settings, label: "Settings", to: "/admin/settings" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "AD";

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-[#0A1628] text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#C9A84C] text-xs font-bold text-[#0A1628]">A</div>
          <span className="font-display text-sm font-semibold">AVR Admin</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ icon: Icon, label, to }) => {
              const active = pathname === to;
              return (
                <Link key={to} to={to as any} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#C9A84C]/20 text-[#C9A84C]"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}>
                  <Icon className="h-4 w-4" />
                  {label}
                  {active && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-3">
          <button onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
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
