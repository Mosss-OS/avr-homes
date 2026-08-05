"use client";

/**
 * Agent profile page — bio, contact actions, verified badge, and the
 * agent's live listings.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api-client";
import { PropertyCard } from "@/components/property-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Property } from "@/lib/properties";
import { BadgeCheck, Phone, Mail, MessageCircle, ChevronLeft, Building2, Award, Star } from "lucide-react";

interface AgentDetail {
  id: number;
  slug: string;
  photo_url: string | null;
  name: string;
  agency: string;
  phone: string;
  email: string;
  whatsapp: string | null;
  languages: string[];
  listings: number;
  avatar_hue: number;
  bio: string;
  experience: string | null;
  state: string | null;
  city: string | null;
  lasrera_number: string | null;
  niesv_number: string | null;
  is_verified: boolean;
  properties: any[];
}

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function AgentDetailPage() {
  const params = useParams();
  const slug = String(params.slug ?? "");

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setStatus("loading");
    api.get<AgentDetail>(`/api/agents/by-slug/${slug}`)
      .then((res) => {
        if (cancelled) return;
        setAgent(res.data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(err instanceof ApiError && err.status === 404 ? "missing" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "loading" || !agent) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Skeleton className="h-4 w-32" />
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="w-full space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Agent not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This profile may have been removed.</p>
        <Link href="/agents" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Browse all agents
        </Link>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
        <Link href="/agents" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Back to agents
        </Link>
      </div>
    );
  }

  const properties: Property[] = (agent.properties ?? []).map((r: any) => ({
    ...r,
    image: r.image ?? null,
    video_url: null,
    virtual_tour_url: null,
    floor_plan_url: null,
    gallery: r.image ? [r.image] : [],
    amenities: [],
    description: "",
    lat: 0,
    lng: 0,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <Link href="/agents" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All agents
      </Link>

      {/* Profile header */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          {agent.photo_url ? (
            <img src={agent.photo_url} alt={agent.name} className="h-24 w-24 shrink-0 rounded-full object-cover" />
          ) : (
            <div
              className="grid h-24 w-24 shrink-0 place-items-center rounded-full text-2xl font-bold text-white"
              style={{ background: agent.avatar_hue ? `oklch(0.45 0.1 ${agent.avatar_hue})` : "oklch(0.45 0.1 200)" }}
            >
              {initials(agent.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold sm:text-3xl">{agent.name}</h1>
              {agent.is_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[agent.agency, agent.city, agent.state].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-primary" /> {agent.listings} listings</span>
              {agent.experience && <span className="inline-flex items-center gap-1"><Award className="h-3.5 w-3.5 text-primary" /> {agent.experience}</span>}
              {agent.languages?.length > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-primary" /> Speaks {agent.languages.join(", ")}</span>}
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            {agent.phone && (
              <a href={`tel:${agent.phone}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                <Phone className="h-4 w-4" /> {agent.phone}
              </a>
            )}
            <div className="flex gap-2">
              {agent.email && (
                <a href={`mailto:${agent.email}`} aria-label="Email agent"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-secondary">
                  <Mail className="h-4 w-4 text-primary" /> Email
                </a>
              )}
              {agent.whatsapp && (
                <a href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                  aria-label="Chat on WhatsApp"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-secondary">
                  <MessageCircle className="h-4 w-4 text-primary" /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        {(agent.bio || agent.lasrera_number || agent.niesv_number) && (
          <div className="mt-6 border-t border-border pt-5">
            {agent.bio && <p className="text-sm leading-relaxed text-muted-foreground">{agent.bio}</p>}
            {(agent.lasrera_number || agent.niesv_number) && (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                {agent.lasrera_number && <span>LASRERA: {agent.lasrera_number}</span>}
                {agent.niesv_number && <span>NIESV: {agent.niesv_number}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Listings */}
      <section className="mt-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>Listings</p>
            <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Properties by {agent.name}</h2>
          </div>
        </div>
        {properties.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No active listings right now.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
