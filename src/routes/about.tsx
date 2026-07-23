/**
 * About page (/about).
 * Static informational page covering AVR Homes' mission, founding story,
 * values, and a partnership CTA.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Award, Globe, Lock, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About AVR Homes — Building the Standard for Lagos Real Estate" },
      { name: "description", content: "AVR Homes brings trust, transparency, and world-class standards to Nigerian luxury real estate — from Lekki to the world." },
      { property: "og:title", content: "About AVR Homes — Building the Standard for Lagos Real Estate" },
      { property: "og:description", content: "Building the standard for Lagos real estate — verified listings, professional realtors, diaspora-ready transactions." },
      { property: "og:url", content: "https://avrusthomes.com/about" },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com/about" }],
  }),
  component: About,
});

/** About page — mission statement, story, values grid, and partnership CTA. */
function About() {
  return (
    <div>
      <section className="border-b border-border" style={{ background: "linear-gradient(135deg, #0A1628, #1B2E4B)" }}>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white/90">About AVR Homes</span>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl md:text-6xl">
            Building the Standard for <span style={{ color: "#C9A84C" }}>Lagos Real Estate</span>
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="space-y-5 text-base leading-relaxed text-foreground/85 sm:text-lg">
          <p>AVR Homes was founded in Lekki, Lagos with one mission: to bring trust, transparency, and world-class standards to Nigerian real estate.</p>
          <p>We saw a market where buyers couldn't verify a property title before paying, where realtors had no professional home, and where Lagos's incredible luxury inventory was invisible to diaspora investors abroad.</p>
          <p className="font-display text-xl font-semibold text-foreground">We're changing that — one verified listing at a time.</p>
          <p>AVR Homes is the platform where serious buyers find verified properties, where professional realtors build their careers, and where diaspora investors transact with confidence.</p>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Our Values</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { icon: <ShieldCheck className="h-5 w-5" />, t: "Verified First", b: "Every listing reviewed before going live." },
              { icon: <Award className="h-5 w-5" />, t: "Agent Excellence", b: "We invest in the professionals behind every deal." },
              { icon: <Globe className="h-5 w-5" />, t: "Lagos to the World", b: "Connecting our city's best properties to global buyers." },
              { icon: <Lock className="h-5 w-5" />, t: "Transparent Always", b: "No hidden fees, no surprises." },
            ].map((v) => (
              <div key={v.t} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{v.icon}</div>
                <div>
                  <h3 className="font-display text-lg font-semibold">{v.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{v.b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="font-display text-3xl font-semibold">Want to partner with us?</h2>
        <a href="https://wa.me/2349071459878" target="_blank" rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
          style={{ background: "#25D366" }}>
          <MessageCircle className="h-4 w-4" /> Contact us on WhatsApp
        </a>
      </section>
    </div>
  );
}
