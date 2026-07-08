/**
 * Floating chat widget that lets users describe property needs in natural
 * language and get matching listings via the /api/ai-search endpoint.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/properties";

/** A single listing returned by the AI search endpoint. */
interface Match {
  id: string | number;
  title: string;
  price: number;
  city: string;
  community: string;
}
/** A chat message rendered inside the widget. */
interface Message {
  role: "user" | "assistant";
  text: string;
  matches?: Match[];
}

const SUGGESTIONS = [
  "3-bed apartment in Lekki under ₦25M for rent",
  "Land in Abuja with proper title",
  "Family duplex in Port Harcourt",
  "Cheapest homes in Owerri or Asaba",
];

/** Floating AI-powered chat widget for natural-language property search. */
export function AiSearchWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hi 👋 Tell me what you're looking for — location, budget, beds, or 'land in Abuja with C of O'. I'll pull matching listings." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send(text: string) {
    const query = text.trim();
    if (!query || loading) return;
    setMessages((m) => [...m, { role: "user", text: query }]);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await r.json();
      if (!r.ok) {
        setMessages((m) => [...m, { role: "assistant", text: data.error || "Something went wrong." }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: data.reply, matches: data.matches }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Network error — please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-5 z-40 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-[var(--shadow-elevated)] transition hover:scale-105 sm:right-6"
          style={{ background: "#0A1628", color: "#C9A84C" }}
          aria-label="Open AI property search"
        >
          <Sparkles className="h-4 w-4" /> AI Search
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[560px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-[var(--shadow-elevated)] sm:right-6 sm:bottom-6">
          <div className="flex items-center justify-between px-4 py-3" style={{ background: "#0A1628", color: "white" }}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "#C9A84C" }} />
              <div>
                <div className="text-sm font-semibold">AVR AI Search</div>
                <div className="text-[10px] text-white/60">Powered by Lovable AI</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i}>
                {m.role === "assistant" ? (
                  <div className="text-sm text-foreground whitespace-pre-wrap">{m.text}</div>
                ) : (
                  <div className="ml-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground w-fit">
                    {m.text}
                  </div>
                )}
                {m.matches && m.matches.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {m.matches.map((mm) => (
                      <Link
                        key={mm.id}
                        to="/properties/$id"
                        params={{ id: String(mm.id) }}
                        onClick={() => setOpen(false)}
                        className="block rounded-xl border border-border bg-card px-3 py-2 text-xs hover:border-primary transition"
                      >
                        <div className="font-semibold text-foreground">{formatPrice(mm.price)}</div>
                        <div className="line-clamp-1">{mm.title}</div>
                        <div className="text-muted-foreground">{mm.community}, {mm.city}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:border-primary hover:text-primary transition">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about homes or land…"
              disabled={loading}
              className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
