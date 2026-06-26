import { Link, useRouter } from "@tanstack/react-router";
import { Heart, Map, Users, Building2, Menu, X, Share2, Check, Instagram, Linkedin, Facebook, Youtube, Music2, LogIn, LayoutDashboard, LogOut, ChevronDown, Home, Search, ShieldCheck, BarChart3, Info, Phone, Globe, GraduationCap, BookOpen, DollarSign, Send, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
const LOGO_URL = "https://res.cloudinary.com/dv0tt80vn/image/upload/v1782211724/AVRUST_LOGO-removebg-preview_rhui5h.png";

interface MegaItem {
  label: string;
  href?: string;
  to?: string;
  search?: Record<string, unknown>;
  icon?: React.ComponentType<{ className?: string }>;
  desc?: string;
}

interface MegaGroup {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: MegaItem[];
}

const MEGA_MENU: MegaGroup[] = [
  {
    label: "Properties",
    icon: Building2,
    items: [
      { label: "Buy", to: "/properties", search: { purpose: "buy" }, icon: Home, desc: "Luxury homes for purchase" },
      { label: "Rent", to: "/properties", search: { purpose: "rent" }, icon: Search, desc: "Premium rental listings" },
      { label: "Map View", to: "/map", icon: Map, desc: "Explore properties on map" },
      { label: "Virtual Tours", to: "/properties", search: { purpose: "buy" }, icon: Globe, desc: "360° virtual walkthroughs" },
    ],
  },
  {
    label: "Agents",
    icon: Users,
    items: [
      { label: "Find an Agent", to: "/agents", icon: Users, desc: "Browse verified agents" },
      { label: "Become an Agent", to: "/agent/register", icon: ShieldCheck, desc: "Join AVR Homes network" },
      { label: "Agent Login", to: "/agent/login", icon: LogIn, desc: "Access your dashboard" },
    ],
  },
  {
    label: "Resources",
    icon: BookOpen,
    items: [
      { label: "Market Insights", to: "/insights", icon: BarChart3, desc: "Lagos real estate trends" },
      { label: "Diaspora Investors", to: "/diaspora", icon: Globe, desc: "Invest from abroad" },
      { label: "About Us", to: "/about", icon: Info, desc: "Our story & mission" },
      { label: "Contact", to: "/contact", icon: Phone, desc: "Get in touch" },
    ],
  },
  {
    label: "More",
    icon: Sparkles,
    items: [
      { label: "Saved Properties", to: "/saved", icon: Heart, desc: "Your saved listings" },
      { label: "Educational Guides", href: "#", icon: GraduationCap, desc: "Buying & selling guides" },
      { label: "Investor Programs", to: "/diaspora", icon: DollarSign, desc: "Fractional investment" },
      { label: "Newsletter", href: "#", icon: Send, desc: "Monthly market updates" },
    ],
  },
];

export function SiteHeader() {
  const { user, isAgent, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<number | null>(null);
  const [shared, setShared] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const isPropertyPage = pathname.startsWith("/properties/") && pathname.split("/").length === 3;

  function handleLogout() {
    logout();
    router.navigate({ to: "/" });
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1500);
      }
    } catch { /* cancelled */ }
  }

  function handleMegaEnter(index: number) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveMega(index);
  }

  function handleMegaLeave() {
    closeTimer.current = setTimeout(() => setActiveMega(null), 150);
  }

  useEffect(() => {
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 relative">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <img
            src={LOGO_URL}
            alt="AVR Homes"
            className="h-14 w-14 rounded-xl object-cover sm:h-16 sm:w-16"
          />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">
              AVR Homes<span className="text-[var(--gold)]">.</span>
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:block">
              Lagos Luxury, Verified.
            </span>
          </span>
        </Link>

        {/* Desktop Mega Menu */}
        <nav className="hidden items-center gap-0 lg:flex"
          onMouseLeave={handleMegaLeave}>
          {MEGA_MENU.map((group, i) => (
            <div key={group.label}
              onMouseEnter={() => handleMegaEnter(i)}>
              <button
                className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  activeMega === i ? "bg-secondary text-foreground" : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                }`}
              >
                {group.label}
                <ChevronDown className={`h-3.5 w-3.5 transition ${activeMega === i ? "rotate-180" : ""}`} />
              </button>
            </div>
          ))}
        </nav>

        {/* Mega Menu Dropdown - centered on page */}
        {activeMega !== null && (() => {
          const group = MEGA_MENU[activeMega];
          const IconComp = group.icon;
          return (
            <div className="absolute left-[10vw] top-full z-50 w-[80vw] max-w-6xl pt-2"
              onMouseEnter={() => handleMegaEnter(activeMega)}
              onMouseLeave={handleMegaLeave}>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elevated)]">
                <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
                  {IconComp && <IconComp className="h-5 w-5 text-primary" />}
                  <span className="font-display text-base font-semibold">{group.label}</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const content = (
                      <div className="group/item flex items-start gap-3 rounded-xl p-3 transition hover:bg-secondary/80">
                        {ItemIcon && (
                          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                            <ItemIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium group-hover/item:text-primary">{item.label}</div>
                          {item.desc && <div className="text-xs text-muted-foreground">{item.desc}</div>}
                        </div>
                      </div>
                    );

                    if (item.to) {
                      return (
                        <Link key={item.label} to={item.to} search={item.search as never} onClick={() => setActiveMega(null)}>
                          {content}
                        </Link>
                      );
                    }
                    return (
                      <a key={item.label} href={item.href || "#"} onClick={() => setActiveMega(null)}>
                        {content}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="flex items-center gap-1.5 sm:gap-2">
          {isPropertyPage && (
            <button
              onClick={share}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary"
            >
              {shared ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Share2 className="h-3.5 w-3.5" />}
              {shared ? "Copied" : "Share"}
            </button>
          )}
          {user && isAgent ? (
            <>
              <Link
                to="/agent/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />Dashboard
              </Link>
              <div className="hidden sm:grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-primary-foreground"
                style={{ background: `oklch(0.45 0.1 200)` }}>
                {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <button onClick={handleLogout}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-destructive hover:text-destructive-foreground">
                <LogOut className="h-3.5 w-3.5" />Logout
              </button>
            </>
          ) : (
            <Link
              to="/agent/login"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary"
            >
              <LogIn className="h-3.5 w-3.5" />Agent Login
            </Link>
          )}
          <Link
            to="/contact"
            className="hidden rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 sm:inline-flex sm:items-center sm:gap-1.5"
          >
            Contact
          </Link>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-lg text-foreground/80 hover:bg-secondary lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
            {MEGA_MENU.flatMap((group) =>
              group.items.map((item) => {
                if (item.to) {
                  return (
                    <MobileLink key={item.label} to={item.to} search={item.search} onClick={() => setOpen(false)}>
                      {item.icon && <item.icon className="h-4 w-4" />}
                      {item.label}
                    </MobileLink>
                  );
                }
                return (
                  <a key={item.label} href={item.href || "#"} onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-secondary">
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.label}
                  </a>
                );
              })
            )}
            <hr className="my-2 border-border" />
            {user && isAgent ? (
              <>
                <MobileLink to="/agent/dashboard" onClick={() => setOpen(false)}>
                  <LayoutDashboard className="h-4 w-4" />Dashboard
                </MobileLink>
                <button onClick={() => { handleLogout(); setOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-destructive hover:text-destructive-foreground">
                  <LogOut className="h-4 w-4" />Logout
                </button>
              </>
            ) : (
              <>
                <MobileLink to="/agent/login" onClick={() => setOpen(false)}>
                  <LogIn className="h-4 w-4" />Agent Login
                </MobileLink>
                <MobileLink to="/agent/register" onClick={() => setOpen(false)}>
                  <ShieldCheck className="h-4 w-4" />Become an Agent
                </MobileLink>
              </>
            )}
            {isPropertyPage && (
              <button
                onClick={() => { share(); setOpen(false); }}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-secondary"
              >
                {shared ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
                {shared ? "Copied" : "Share property"}
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function MobileLink({ to, search, children, onClick }: { to: string; search?: Record<string, unknown>; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      to={to}
      search={search as never}
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-secondary"
      activeProps={{ className: "bg-secondary text-foreground" }}
    >
      {children}
    </Link>
  );
}

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/avrhomes.ng", icon: Instagram },
  { label: "TikTok", href: "https://tiktok.com/@avrhomes", icon: Music2 },
  { label: "LinkedIn", href: "https://linkedin.com/company/avr-homes", icon: Linkedin },
  { label: "Facebook", href: "https://facebook.com/avrhomesng", icon: Facebook },
  { label: "YouTube", href: "https://youtube.com/@avrhomes", icon: Youtube },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="AVR Homes" className="h-14 w-14 rounded-xl object-cover" />
            <span className="font-display text-xl font-semibold">AVR Homes.</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Lagos Luxury, Verified. — Lekki, Ikoyi, Victoria Island, Banana Island & Eko Atlantic.
          </p>
          <address className="mt-4 not-italic text-sm text-muted-foreground">
            <div className="font-medium text-foreground">Visit us</div>
            2 Lanre Olumide Street,<br />
            Idado Estate, Igbo-efon,<br />
            Lekki, Lagos, Nigeria.
          </address>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/properties" search={{ purpose: "buy" } as never} className="hover:text-foreground">Buy</Link></li>
            <li><Link to="/properties" search={{ purpose: "rent" } as never} className="hover:text-foreground">Rent</Link></li>
            <li><Link to="/map" className="hover:text-foreground">Map view</Link></li>
            <li><Link to="/agents" className="hover:text-foreground">Agents</Link></li>
            <li><Link to="/insights" className="hover:text-foreground">Market Insights</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
            <li><Link to="/agent/register" className="hover:text-foreground">Become an Agent</Link></li>
            <li><Link to="/agent/login" className="hover:text-foreground">Agent Login</Link></li>
            <li><Link to="/diaspora" className="hover:text-foreground">Diaspora Investors</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Follow AVR Homes</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground/70 transition hover:bg-primary hover:text-primary-foreground"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">hello@avrhomes.ng</p>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} AVR Homes — Lekki, Lagos. All rights reserved.
      </div>
    </footer>
  );
}
