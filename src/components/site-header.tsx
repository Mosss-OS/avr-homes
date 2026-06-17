import { Link, useRouter } from "@tanstack/react-router";
import { Heart, Map, Users, Building2, Menu, X, Share2, Check, Instagram, Linkedin, Facebook, Youtube, Music2 } from "lucide-react";
import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const isPropertyPage = pathname.startsWith("/properties/") && pathname.split("/").length === 3;

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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">
              AVR Homes<span className="text-[var(--gold)]">.</span>
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:block">
              Lagos Luxury, Verified.
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink to="/properties" search={{ purpose: "buy" }}>Buy</NavLink>
          <NavLink to="/properties" search={{ purpose: "rent" }}>Rent</NavLink>
          <NavLink to="/map">
            <span className="inline-flex items-center gap-1.5"><Map className="h-4 w-4" />Map</span>
          </NavLink>
          <NavLink to="/agents">
            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />Agents</span>
          </NavLink>
          <NavAnchor href="/#for-agents">For Agents</NavAnchor>
          <NavLink to="/insights">Market Insights</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/saved">
            <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4" />Saved</span>
          </NavLink>
        </nav>
        <div className="flex items-center gap-2">
          {isPropertyPage && (
            <button
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary"
            >
              {shared ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Share2 className="h-3.5 w-3.5" />}
              {shared ? "Copied" : "Share"}
            </button>
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
      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
            <MobileLink to="/properties" search={{ purpose: "buy" }} onClick={() => setOpen(false)}>Buy</MobileLink>
            <MobileLink to="/properties" search={{ purpose: "rent" }} onClick={() => setOpen(false)}>Rent</MobileLink>
            <MobileLink to="/map" onClick={() => setOpen(false)}>Map</MobileLink>
            <MobileLink to="/agents" onClick={() => setOpen(false)}>Agents</MobileLink>
            <a href="/#for-agents" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-secondary">For Agents</a>
            <MobileLink to="/insights" onClick={() => setOpen(false)}>Market Insights</MobileLink>
            <MobileLink to="/about" onClick={() => setOpen(false)}>About</MobileLink>
            <MobileLink to="/saved" onClick={() => setOpen(false)}>Saved</MobileLink>
            <MobileLink to="/contact" onClick={() => setOpen(false)}>Contact</MobileLink>
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

function NavLink({ to, search, children }: { to: string; search?: Record<string, unknown>; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      search={search as never}
      className="rounded-full px-3.5 py-2 text-sm font-medium text-foreground/70 transition hover:bg-secondary hover:text-foreground"
      activeProps={{ className: "bg-secondary text-foreground" }}
    >
      {children}
    </Link>
  );
}
function NavAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="rounded-full px-3.5 py-2 text-sm font-medium text-foreground/70 transition hover:bg-secondary hover:text-foreground">
      {children}
    </a>
  );
}
function MobileLink({ to, search, children, onClick }: { to: string; search?: Record<string, unknown>; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      to={to}
      search={search as never}
      onClick={onClick}
      className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-secondary"
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
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-semibold">AVR Homes.</span>
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
