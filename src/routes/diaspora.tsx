import { createFileRoute, Link } from "@tanstack/react-router";
import { Plane, ShieldCheck, FileCheck, Banknote } from "lucide-react";

export const Route = createFileRoute("/diaspora")({
  head: () => ({
    meta: [
      { title: "Diaspora Investor Guide — AVR Homes" },
      { name: "description", content: "Buying Lagos property from abroad? Virtual tours, verified titles, escrow protection, and multi-currency pricing for diaspora investors." },
      { property: "og:title", content: "Diaspora Investor Guide — AVR Homes" },
      { property: "og:description", content: "Invest in Lagos real estate from abroad. Virtual tours, verified titles, escrow-protected transactions, and multi-currency pricing in USD, GBP, and NGN." },
      { property: "og:url", content: "https://avrusthomes.com/diaspora" },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com/diaspora" }],
  }),
  component: Diaspora,
});

function Diaspora() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>Diaspora Investors</p>
      <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Investing in Lagos from abroad — made simple.</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">A growing community of UK, US, and Canadian-based Nigerians trust AVR Homes to source, verify, and close Lagos property deals on their behalf.</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {[
          { i: <Plane className="h-5 w-5" />, t: "Virtual tours", b: "Live walkthrough video calls with the listing agent — see the home before you fly." },
          { i: <FileCheck className="h-5 w-5" />, t: "Verified titles", b: "Every listing's title documents are reviewed before going live on AVR Homes." },
          { i: <ShieldCheck className="h-5 w-5" />, t: "Escrow-protected", b: "Funds are held by a regulated escrow partner until conditions are met." },
          { i: <Banknote className="h-5 w-5" />, t: "Multi-currency pricing", b: "View prices in ₦, $ and £ — pay via the route that works for you." },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-border bg-card p-5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">{c.i}</div>
            <h3 className="mt-3 font-display text-lg font-semibold">{c.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.b}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Link to="/contact" className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Speak to a diaspora advisor
        </Link>
      </div>
    </div>
  );
}
