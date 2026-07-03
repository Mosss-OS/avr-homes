## What we're building

Based on your answers: broader national hero, browse structure both on homepage AND dedicated pages, map integration both as filter-links AND mini-map previews, and a phased AI rollout starting with the search assistant.

## 1. Hero section (immediate)

`src/routes/index.tsx`:
- New headline: **"Homes, Lands & Property — Across Nigeria"** (gold accent on "Across Nigeria")
- Center the hero: title, subtitle, search bar, and CTA all `text-center` and `mx-auto`
- Bigger desktop typography: `md:text-7xl lg:text-8xl` for the H1, `md:text-xl lg:text-2xl` for subtitle, larger padding
- Update subtitle to mention Abuja, Lagos, Port Harcourt, Delta, Imo, Anambra
- Search bar container centered with `mx-auto max-w-4xl`

## 2. New "Land" support in the data layer

`src/lib/properties.ts`:
- Add `"land"` to `PropertyType` union + `propertyTypes` list
- Extend `Purpose` conceptually — land is always `"buy"`, so no schema change, just filter by `type=land`
- Add 6–8 seed land listings across Lagos, Abuja, Port Harcourt, Delta, Imo, Anambra so the new sections aren't empty
- Expand `cities` to include Asaba (Delta), Owerri (Imo), Awka (Anambra) alongside existing Lagos/Abuja/Port Harcourt/Ibadan/Benin City

## 3. Homepage browse sections (three blocks)

New component `src/components/browse-section.tsx` used three times on `/`:
- **Homes for Sale** → links to `/buy` + state chips → `/properties?purpose=buy&city=X`
- **Homes for Rent** → links to `/rent` + state chips → `/properties?purpose=rent&city=X`
- **Land for Sale** → links to `/land` + state chips → `/properties?type=land&city=X`

Each section shows:
- Section title + "View all" link to category page
- **Mini-map preview** (reuses stylized map from `/map`, filtered to that category) on desktop
- Horizontal state chips: Lagos, Abuja, Port Harcourt, Delta, Imo, Anambra
- 3 featured cards from that category

## 4. Category + state routes

New route files:
- `src/routes/buy.tsx` — homes for sale, lists all states, links into `/properties?purpose=buy&city=X`
- `src/routes/rent.tsx` — homes for rent, same pattern
- `src/routes/land.tsx` — land for sale
- Each with its own `head()` meta (title, description, og tags)

Rather than creating 18 static state pages (6 states × 3 categories), state links use the existing `/properties` search-params route — same result, less duplication, one page to maintain. If you later want dedicated pages like `/buy/lagos` for SEO, we can add them then.

## 5. Map integration

- Each state chip on homepage sections links to `/map?purpose=X&city=Y` (or `?type=land&city=Y`)
- Update `src/routes/map.tsx` to read `validateSearch` (purpose, type, city) and filter its pins accordingly
- Mini-maps on homepage sections are read-only previews that click through to the full filtered `/map`

## 6. AI features (phased)

**Phase 1 (this build): AI Search Assistant**
- New route `src/routes/api/ai-search.ts` — TanStack server route using Lovable AI Gateway (`google/gemini-3-flash-preview`)
- Sends the property catalog + user query, returns matching property IDs + short reasoning
- New floating chat widget `src/components/ai-search-widget.tsx` — bottom-right button opens a chat panel
- Uses Lovable AI (no API key setup needed on your side; I'll provision `LOVABLE_API_KEY` if not present)

**Phase 2 (next round): AI listing description generator** — added to agent dashboard listing create/edit
**Phase 3 (after that): AI valuation estimate** — public form → estimated price range

## Technical notes

- All AI calls stay server-side via TanStack server routes; no API keys in client code
- State/category chips update URL search params so results are shareable/bookmarkable
- Mini-maps reuse the existing SVG map style — no external map library needed
- New seed listings use the same stock property photos we already have

## Deliverable order

I'll ship phase 1 (hero + sections + routes + map filters + AI search) as one build. Phases 2 and 3 come in follow-ups so you can review each properly.

Ready to build?
