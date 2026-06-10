import { Link } from "@tanstack/react-router";
import { Home, Heart, Map, Users, Building2 } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            AVR Homes<span className="text-[var(--gold)]">.</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/properties" search={{ purpose: "buy" }}>Buy</NavLink>
          <NavLink to="/properties" search={{ purpose: "rent" }}>Rent</NavLink>
          <NavLink to="/map">
            <span className="inline-flex items-center gap-1.5"><Map className="h-4 w-4" />Map</span>
          </NavLink>
          <NavLink to="/agents">
            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />Agents</span>
          </NavLink>
          <NavLink to="/saved">
            <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4" />Saved</span>
          </NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="hidden rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 sm:inline-flex sm:items-center sm:gap-1.5"
          >
            <Home className="h-4 w-4" />
            List property
          </Link>
        </div>
      </div>
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

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-semibold">AVR Homes.</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            UAE's modern home search — Dubai, Abu Dhabi & beyond.
          </p>
        </div>
        <FooterCol title="Explore" links={["Buy", "Rent", "New projects", "Map view"]} />
        <FooterCol title="For pros" links={["List property", "Agent dashboard", "Pricing", "Insights"]} />
        <FooterCol title="Company" links={["About", "Careers", "Contact", "Privacy"]} />
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} AVR Homes. Independently built. Not affiliated with any third party.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {links.map((l) => <li key={l}><a className="hover:text-foreground" href="#">{l}</a></li>)}
      </ul>
    </div>
  );
}
