import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, Mail, Globe } from "lucide-react";
import { fetchAgents, agents as fallbackAgents, properties } from "@/lib/properties";
import type { AgentData } from "@/lib/types";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Top Lagos Real Estate Agents — AVR Homes" },
      { name: "description", content: "Connect with verified luxury property agents across Lekki, Ikoyi, Victoria Island and beyond." },
      { property: "og:title", content: "Top Lagos Real Estate Agents — AVR Homes" },
      { property: "og:description", content: "Find trusted, verified real estate agents in Lagos. Browse agent profiles and get in touch directly." },
      { property: "og:url", content: "https://avrusthomes.com/agents" },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com/agents" }],
  }),
  component: Agents,
});

function Agents() {
  const [agentList, setAgentList] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents()
      .then(setAgentList)
      .catch(() => {
        setAgentList(
          fallbackAgents.map((a) => ({
            id: a.id,
            name: a.name,
            agency: a.agency,
            phone: a.phone,
            email: a.email,
            languages: a.languages,
            avatar_hue: a.avatarHue,
            listings: a.listings,
            bio: null,
            photo_url: null,
          } as AgentData))
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--gold)]">Talk to a pro</p>
        <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Top Lagos agents</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Loading agents…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--gold)]">Talk to a pro</p>
      <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Top Lagos agents</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Verified, top-rated agents who actually respond. Pick someone who knows your neighborhood.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {agentList.map((a) => {
          const count = a.listings;
          return (
            <div key={a.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
              <div className="h-20" style={{ background: `linear-gradient(135deg, oklch(0.55 0.12 ${a.avatar_hue}), oklch(0.4 0.08 ${a.avatar_hue + 30}))` }} />
              <div className="-mt-10 p-5">
                <div className="grid h-20 w-20 place-items-center rounded-full border-4 border-card font-display text-2xl font-semibold text-primary-foreground"
                  style={{ background: `oklch(0.45 0.1 ${a.avatar_hue})` }}>
                  {a.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <h3 className="mt-3 font-display text-xl font-semibold">{a.name}</h3>
                <p className="text-sm text-muted-foreground">{a.agency} · {count} live listings</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.languages.map((l) => (
                    <span key={l} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs">
                      <Globe className="h-3 w-3" />{l}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid gap-2">
                  <a href={`tel:${a.phone}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                    <Phone className="h-4 w-4" /> {a.phone}
                  </a>
                  <a href={`mailto:${a.email}`} className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary">
                    <Mail className="h-4 w-4" /> Email
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
