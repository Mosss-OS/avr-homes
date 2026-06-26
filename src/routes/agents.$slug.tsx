import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Phone, Mail, MessageSquare, MapPin, BadgeCheck, Globe, Star,
  Instagram, Facebook, Linkedin, Youtube, Loader2, Home, ArrowLeft, Send,
} from "lucide-react";

export const Route = createFileRoute("/agents/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: "Agent Profile — AVR Homes" },
      { name: "description", content: "View agent profile and listings." },
    ],
  }),
  component: AgentProfilePage,
});

interface AgentPublicProfile {
  id: number;
  slug: string | null;
  photo_url: string | null;
  name: string;
  agency: string;
  phone: string;
  email: string;
  whatsapp: string | null;
  languages: string[];
  listings: number;
  avatar_hue: number;
  bio: string | null;
  experience: string | null;
  state: string | null;
  city: string | null;
  lasrera_number: string | null;
  niesv_number: string | null;
  is_verified: boolean;
  social_instagram: string | null;
  social_facebook: string | null;
  social_linkedin: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
  properties: AgentProperty[];
}

interface AgentProperty {
  id: number;
  title: string;
  slug: string;
  type: string;
  purpose: string;
  price: number;
  image: string | null;
  city: string;
  community: string;
  beds: number;
  baths: number;
  area: number;
  featured: boolean;
  is_verified: boolean;
}

function formatPrice(price: number) {
  if (price >= 1e9) return `₦${(price / 1e9).toFixed(1)}B`;
  if (price >= 1e6) return `₦${(price / 1e6).toFixed(1)}M`;
  return `₦${price.toLocaleString()}`;
}

function AgentProfilePage() {
  const { slug } = Route.useParams();
  const [agent, setAgent] = useState<AgentPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquirySending, setInquirySending] = useState(false);

  useEffect(() => {
    api.get<AgentPublicProfile>(`/api/agents/by-slug/${slug}`)
      .then((r) => setAgent(r.data))
      .catch(() => setAgent(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (agent) {
      document.title = `${agent.name} — AVR Homes Agent`;
    }
  }, [agent]);

  async function handleInquiry() {
    if (!inquiryName.trim() || !inquiryEmail.trim() || !inquiryMessage.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setInquirySending(true);
    try {
      await api.post("/api/inquiries", {
        name: inquiryName, email: inquiryEmail, phone: inquiryPhone,
        message: inquiryMessage, agent_id: agent!.id,
      });
      toast.success("Message sent successfully");
      setInquiryOpen(false);
      setInquiryName(""); setInquiryEmail(""); setInquiryPhone(""); setInquiryMessage("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setInquirySending(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!agent) {
    throw notFound();
  }

  const initials = agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  const socialLinks = [
    { key: "social_instagram", icon: Instagram, href: agent.social_instagram ? `https://instagram.com/${agent.social_instagram.replace("@", "")}` : null },
    { key: "social_facebook", icon: Facebook, href: agent.social_facebook ? `https://facebook.com/${agent.social_facebook}` : null },
    { key: "social_linkedin", icon: Linkedin, href: agent.social_linkedin ? `https://linkedin.com/in/${agent.social_linkedin}` : null },
    { key: "social_youtube", icon: Youtube, href: agent.social_youtube ? `https://youtube.com/@${agent.social_youtube}` : null },
  ].filter((s) => s.href);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link to="/agents" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to agents
      </Link>

      {/* Hero Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="h-32 sm:h-40" style={{ background: `linear-gradient(135deg, oklch(0.55 0.12 ${agent.avatar_hue}), oklch(0.4 0.08 ${agent.avatar_hue + 30}))` }} />
        <div className="px-6 pb-6">
          <div className="-mt-16 flex flex-wrap items-end gap-5">
            {agent.photo_url ? (
              <img src={agent.photo_url} alt={agent.name}
                className="h-24 w-24 rounded-full border-4 border-card object-cover sm:h-28 sm:w-28" />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-full border-4 border-card font-display text-3xl font-semibold text-primary-foreground sm:h-28 sm:w-28"
                style={{ background: `oklch(0.45 0.1 ${agent.avatar_hue})` }}>
                {initials}
              </div>
            )}
            <div className="flex flex-1 flex-wrap items-start justify-between gap-4 pt-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold sm:text-3xl">{agent.name}</h1>
                  {agent.is_verified && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                      <BadgeCheck className="mr-1 h-3 w-3" /> Verified
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{agent.agency}</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {[agent.city, agent.state].filter(Boolean).join(", ") || "Lagos, Nigeria"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`tel:${agent.phone}`}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  <Phone className="h-4 w-4" /> Call
                </a>
                {agent.whatsapp && (
                  <a href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                    <MessageSquare className="h-4 w-4" /> WhatsApp
                  </a>
                )}
                <a href={`mailto:${agent.email}`}
                  className="inline-flex items-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
                  <Mail className="h-4 w-4" /> Email
                </a>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-accent/50 p-3 text-center">
              <p className="text-2xl font-bold">{agent.listings}</p>
              <p className="text-xs text-muted-foreground">Active Listings</p>
            </div>
            <div className="rounded-lg bg-accent/50 p-3 text-center">
              <p className="text-2xl font-bold capitalize">{agent.experience || "—"}</p>
              <p className="text-xs text-muted-foreground">Years Experience</p>
            </div>
            <div className="rounded-lg bg-accent/50 p-3 text-center">
              <div className="flex flex-wrap justify-center gap-1">
                {agent.languages.slice(0, 3).map((l) => (
                  <span key={l} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                    <Globe className="h-3 w-3" />{l}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Languages</p>
            </div>
          </div>

          {/* Bio */}
          {agent.bio && (
            <div className="mt-6">
              <h2 className="font-semibold mb-2">About</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{agent.bio}</p>
            </div>
          )}

          {/* Credentials */}
          {(agent.lasrera_number || agent.niesv_number) && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {agent.lasrera_number && (
                <p className="text-muted-foreground"><span className="font-medium text-foreground">LASRERA:</span> {agent.lasrera_number}</p>
              )}
              {agent.niesv_number && (
                <p className="text-muted-foreground"><span className="font-medium text-foreground">NIESV:</span> {agent.niesv_number}</p>
              )}
            </div>
          )}

          {/* Social Links */}
          {socialLinks.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              {socialLinks.map(({ key, icon: Icon, href }) => (
                <a key={key} href={href!} target="_blank" rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-input text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}

          {/* Contact Agent Button */}
          <div className="mt-6">
            <Button onClick={() => setInquiryOpen(true)} className="rounded-full" size="lg">
              <Send className="mr-2 h-4 w-4" /> Contact {agent.name.split(" ")[0]}
            </Button>
          </div>
        </div>
      </div>

      {/* Listings */}
      {agent.properties.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-xl font-bold mb-4">Active Listings ({agent.properties.length})</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agent.properties.map((p) => (
              <Link key={p.id} to={"/properties/$id"} params={{ id: String(p.id) }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-shadow hover:shadow-lg">
                <div className="aspect-[16/10] bg-accent flex items-center justify-center">
                  {p.image ? (
                    <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                  ) : (
                    <Home className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold group-hover:text-primary transition-colors truncate">{p.title}</h3>
                    {p.is_verified && <BadgeCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.city}, {p.community}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-bold">{formatPrice(p.price)}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{p.beds} bed</span>
                      <span>{p.baths} bath</span>
                      <span>{p.area}m²</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="mt-2 capitalize text-xs">
                    {p.type} &middot; {p.purpose === "buy" ? "For Sale" : "For Rent"}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Inquiry Sheet */}
      <Sheet open={inquiryOpen} onOpenChange={setInquiryOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader className="mb-6">
            <SheetTitle>Contact {agent.name}</SheetTitle>
            <SheetDescription>Send a message to this agent about their properties.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inq-name">Name *</Label>
              <Input id="inq-name" value={inquiryName} onChange={(e) => setInquiryName(e.target.value)} placeholder="Your full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inq-email">Email *</Label>
              <Input id="inq-email" type="email" value={inquiryEmail} onChange={(e) => setInquiryEmail(e.target.value)} placeholder="your@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inq-phone">Phone</Label>
              <Input id="inq-phone" type="tel" value={inquiryPhone} onChange={(e) => setInquiryPhone(e.target.value)} placeholder="+234 801 234 5678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inq-message">Message *</Label>
              <Textarea id="inq-message" value={inquiryMessage} onChange={(e) => setInquiryMessage(e.target.value)}
                placeholder={`Hi ${agent.name}, I'm interested in learning more about your listings...`} rows={4} />
            </div>
            <Button onClick={handleInquiry} disabled={inquirySending} className="w-full rounded-full">
              {inquirySending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Message
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
