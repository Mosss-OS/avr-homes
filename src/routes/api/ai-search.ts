/**
 * AI-powered property search API route (POST /api/ai-search).
 * Receives a natural-language query, serialises the available property catalog,
 * sends it to an LLM gateway, and returns the AI reply along with matching property IDs.
 */
import { createFileRoute } from "@tanstack/react-router";
import { properties } from "@/lib/properties";

const SYSTEM_PROMPT = `You are AVR Homes' property search assistant. You help buyers, renters and diaspora investors find Nigerian real estate.

You are given a JSON list of available properties (id, title, type, purpose, price in NGN, beds, baths, area in sqm, city, community, description). The user asks a question in natural language (e.g. "3-bed apartment in Lekki under 20M for rent", "land in Abuja with C of O", "cheapest homes in Owerri").

Reply in this exact structure:
1. One short sentence summarising what you found.
2. A bullet list of up to 5 matching properties using the format "- [id] short reason".
3. If nothing matches, say so plainly and suggest one adjustment.

Keep replies under 120 words. Use Naira (₦) for prices. Do not invent properties that are not in the list.`;

/** Expected shape of the POST request body. */
interface Body {
  query?: string;
}

export const Route = createFileRoute("/api/ai-search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body = {};
        try { body = await request.json() as Body; } catch { /* noop */ }
        const query = (body.query || "").trim();
        if (!query) return Response.json({ error: "Missing query" }, { status: 400 });
        if (query.length > 500) return Response.json({ error: "Query too long" }, { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "AI service unavailable" }, { status: 500 });

        const catalog = properties.map((p) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          purpose: p.purpose,
          price_ngn: p.price,
          beds: p.beds,
          baths: p.baths,
          area_sqm: p.area,
          city: p.city,
          community: p.community,
          description: p.description.slice(0, 160),
        }));

        try {
          const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Available properties:\n${JSON.stringify(catalog)}\n\nUser question: ${query}` },
              ],
            }),
          });

          if (r.status === 429) return Response.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
          if (r.status === 402) return Response.json({ error: "AI credits exhausted. Please contact the site owner." }, { status: 402 });
          if (!r.ok) {
            const text = await r.text();
            console.error("AI gateway error", r.status, text);
            return Response.json({ error: "AI service error" }, { status: 500 });
          }

          const json = await r.json() as { choices?: { message?: { content?: string } }[] };
          const reply = json.choices?.[0]?.message?.content ?? "Sorry, no reply.";

          // Extract matched IDs like "[p-101]" or "[l-201]"
          const ids = Array.from(new Set(
            (reply.match(/\[([a-z0-9-]+)\]/gi) ?? []).map((m) => m.slice(1, -1))
          )).slice(0, 6);
          const matches = properties.filter((p) => ids.includes(String(p.id)));

          return Response.json({ reply, matches: matches.map((p) => ({
            id: p.id, title: p.title, price: p.price, city: p.city, community: p.community,
          })) });
        } catch (e) {
          console.error("AI search failed", e);
          return Response.json({ error: "AI service unavailable" }, { status: 500 });
        }
      },
    },
  },
});
