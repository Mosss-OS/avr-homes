# AVR Homes — Next.js Full-Stack Edition

> **Lagos Luxury, Verified.** — A premium real estate marketplace for luxury properties in Lagos, Nigeria.

AVR Homes connects serious buyers and diaspora investors with verified, professional realtors across Lagos's most prestigious neighborhoods (Lekki, Victoria Island, Ikoyi, Eko Atlantic, and Banana Island). This branch is the **Next.js 15 + TypeScript re-implementation** of the platform: the entire legacy PHP backend has been ported to App Router route handlers and the frontend is being rebuilt as a single, self-hosted Next.js application.

---

## What's on This Branch

| Layer | Status | Description |
|---|---|---|
| `src/app/api/**/route.ts` | **COMPLETE** | 243 API endpoints ported from `backend/api/routes.php` across 197 route files |
| `src/server/` | **COMPLETE** | Server-side helpers: DB, auth, validation, responses, Paystack, Cloudinary, CSV, backup, notifications, models |
| Frontend pages (`src/app/(site)/`) | **IN PROGRESS** | Home, listings, property detail, agents, blog, and saved-properties pages ported |
| `backend/` | **REFERENCE ONLY** | Legacy PHP 8.1 backend kept for behaviour reference (no longer executed) |

---

## Features

### For Buyers & Renters
- **Property Listings** — Browse luxury properties for sale and rent in Lekki, Victoria Island, Ikoyi, Eko Atlantic, and Banana Island.
- **Search & Filtering** — Server-backed search across location, price range, type, and status.
- **Multi-Currency Pricing** — Prices served in NGN and converted on demand.
- **Save Properties** — Bookmark properties and manage a saved shortlist.
- **Agent Contact** — Reach agents directly via phone, email, or WhatsApp.
- **Blog & Insights** — Property market articles served from the CMS.

### For Agents & Realtors
- **Agent Directory** — Professional profiles with listing counts, languages, and contact details.
- **Verified Badge** — Trust signals for verified agent profiles.
- **Agent Portal API** — Full subscription, wallet, and listing management endpoints.

### Platform & Back-Office
- **Admin API** — Dashboard, KYC, investment, pool, and marketplace administration endpoints.
- **Payments** — Paystack integration (transactions, plans, customers, subscriptions, webhooks).
- **Media** — Cloudinary upload pipeline for property imagery and galleries.
- **Notifications** — Email delivery via SMTP with transactional templates.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, RSC, `runtime = "nodejs"`) |
| **Language** | TypeScript (strict mode) |
| **API** | Route handlers — one `route.ts` per path, named `GET/PUT/POST/DELETE` exports |
| **Database** | MySQL (compatible with the legacy MariaDB schema, `backend/database/migrations/`) |
| **DB Driver** | `mysql2` — positional `?` placeholders, transactional helpers |
| **Auth** | Custom JWT (HS256) access + refresh tokens, role guards (user / agent / admin) |
| **Validation** | Fluent `Validator` (email, phone, length, numeric, required, etc.) |
| **UI** | React 19 + Radix UI primitives + [shadcn/ui](https://ui.shadcn.com/) |
| **Styling** | Tailwind CSS v4 (`@source ".."` globals) + OKLCH design tokens |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Forms** | react-hook-form + Zod |
| **State** | @tanstack/react-query |
| **Maps** | Leaflet + OpenStreetMap tiles |
| **Media** | Cloudinary (SDK) + ffmpeg.wasm tooling |
| **Tests** | Vitest + @testing-library/react |
| **Package Manager** | npm |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx               # Root layout (fonts, providers, headers)
│   ├── (site)/
│   │   ├── page.tsx             # Homepage
│   │   ├── properties/
│   │   │   ├── page.tsx         # Listing grid + filters
│   │   │   └── [id]/page.tsx    # Property detail + gallery
│   │   ├── agents/
│   │   │   ├── page.tsx         # Agent directory
│   │   │   └── [slug]/page.tsx  # Agent profile
│   │   ├── blog/
│   │   │   ├── page.tsx         # Blog index
│   │   │   └── [slug]/page.tsx  # Article detail
│   │   └── saved/page.tsx       # Saved properties
│   └── api/                     # 197 route files / 243 endpoints
│       ├── auth/                # register, login, refresh, me, agent auth
│       ├── admin/               # dashboard, users, KYC, investments
│       ├── agent/               # subscription, wallet, listings, profile
│       ├── properties/          # CRUD, search, images, saved
│       ├── blog/                # posts, categories, images
│       ├── pools/               # investment pools + members
│       ├── investments/         # investment lifecycle
│       ├── marketplace/         # listings + offers
│       ├── shortlet/            # short-let availability
│       ├── coupons/             # promo codes
│       ├── inquiries/           # contact + property inquiries
│       ├── notifications/       # in-app notifications
│       ├── kyc/                 # verification documents
│       ├── leaderboard/         # agent rankings
│       ├── saved-searches/      # saved search alerts
│       ├── upload/              # media upload
│       └── stats, health, settings
├── server/
│   ├── db.ts                    # query, fetchOne/All, execute, transactions, rawQuery
│   ├── auth.ts                  # authenticate*, generateToken/RefreshToken, requirePermission
│   ├── http.ts                  # readJson, param
│   ├── response.ts              # success, error, json
│   ├── validator.ts             # fluent Validator
│   ├── rate-limiter.ts          # login/register throttling
│   ├── paystack.ts              # transactions, plans, customers, subscriptions, webhooks
│   ├── cloudinary.ts            # upload/delete helpers
│   ├── notifications.ts         # notify, sendEmail, naira
│   ├── csv.ts                   # toCsv, outputCsv, parseCsv
│   ├── backup.ts                # createBackup, listBackups, getBackupPath
│   ├── image-optimizer.ts       # resize/format helpers
│   ├── smtp.ts                  # mail transport
│   ├── subscription.ts          # plan gating helpers
│   └── models/                  # agent.ts, property.ts, blog.ts
├── components/                  # shared + shadcn/ui primitives
├── hooks/                       # custom React hooks
└── lib/                         # api-client, auth-context, types, utils, media
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | MySQL connection (e.g. Railway / managed MySQL) |
| `JWT_SECRET` | HS256 signing secret for access tokens |
| `CRON_SECRET` | Bearer secret for scheduled/background endpoints |
| `APP_URL` | Canonical public base URL |
| `NEXT_PUBLIC_API_URL` | Public base URL used by the client API layer |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary media pipeline |
| `PAYSTACK_SECRET_KEY` | Paystack live secret key |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Transactional email transport |
| `MAIL_FROM` | Sender address for outbound mail |
| `UPLOAD_MAX_SIZE` | Max upload size in bytes (default 10 MB) |
| `ALLOWED_EXTENSIONS` | Comma-separated image extensions (e.g. `jpg,jpeg,png,webp`) |

> **Security:** never commit real credentials. A sanitized example lives in `backend/.env.example` (legacy reference) and production values are injected at deploy time.

---

## Getting Started

### Prerequisites
- Node.js 20+ (Node 24 is used in production)
- MySQL 8+ / MariaDB (schema in `backend/database/migrations/`)

### Install & Configure
```bash
npm install
cp backend/.env.example .env.local   # then fill in real values
```

### Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### Production Build
```bash
npm run build
npm start
```

### Typecheck (server layer only)
```bash
npx tsc -p tsconfig.server-check.json
```
> Do **not** run repo-wide `tsc` or `next build` until every frontend page is ported; the server-layer project validates the API + `src/server` code today.

### Tests
```bash
npm test          # Vitest
npm run lint      # Next.js ESLint
```

---

## Database

- Schema migrations live in `backend/database/migrations/*.sql` (`001`–`024` plus seed/fix scripts).
- The data model carries over from the legacy app: `users.name` (not `full_name`), `agent_subscriptions.agent_id = users.id`, `agent_wallets.agent_id = users.id`, `wallet_transactions.wallet_id = agent_wallets.id`.
- Agent and admin authorization follow the legacy rules: agent id is derived via `getAgentId(user)`; admin routes require `authenticateAdmin` + `isUser(auth)`; agent routes require `authenticateAgent` + `isUser(auth)`.
- Use `txFetchOne` (not `txExecute`) for SELECTs inside transactions.

---

## API Porting Conventions

The API is a behaviour-for-behaviour port of the PHP backend. Read `docs/API_PORT_GUIDE.md` before touching API code. Key rules:

- One `route.ts` per path; named `GET/PUT/POST/DELETE` exports only.
- `export const runtime = "nodejs"`.
- Next 15 `await params`; bodies via `readJson(req)`.
- Positional `?` SQL placeholders (never inline user input).
- Early `success` / `error` returns; response shapes, messages, and HTTP codes preserved verbatim from the PHP routes.
- Admin routes: `authenticateAdmin(req)` + `isUser(auth)`. Agent routes: `authenticateAgent(req)` + `isUser(auth)`.

---

## Deployment

The production deployment runs on **Vercel** (`avrust-home-next`).

```bash
vercel build --yes
# switch prebuilt output to production target
sed -i 's/"target": "preview"/"target": "production"/' .vercel/output/builds.json
vercel deploy --prebuilt --prod --yes
```

- `.vercel/project.json` must keep `"framework": "nextjs"` — if it is ever `null`, `vercel build` falls back to `@vercel/static-build` and the deploy returns 404s.
- Env vars are set per-environment in the Vercel dashboard or via `vercel env` CLI.
- Security/cache headers are applied both in `vercel.json` and `next.config.ts`.

---

## Status & Roadmap

- [x] Entire PHP API ported to App Router route handlers (243 endpoints, verified by route-coverage scan).
- [x] Server helpers complete (db, auth, validation, paystack, cloudinary, csv, backup, notifications).
- [x] Homepage, listings, property detail, agents, blog, and saved pages ported to `src/app/(site)/`.
- [x] Production deployment live with real hostname + env configuration.
- [ ] Remaining frontend pages ported (dashboard, admin, agent portal).
- [ ] Database host migrated to a service that permits remote MySQL (managed hosting).
- [ ] Replace placeholder Paystack/SMTP credentials with live values.

---

## Related Branches

- `main` / `php_codes` — Legacy architecture: TanStack Start frontend + vanilla PHP backend (reference).
- `next_js` — **This branch.** Active development and production.

---

## License

All rights reserved. Proprietary source code — not for redistribution without written consent.
