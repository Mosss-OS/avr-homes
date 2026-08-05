# AVR Homes

> **Lagos Luxury, Verified.** — A premium real estate marketplace for luxury properties in Lagos, Nigeria.

AVR Homes connects serious buyers and diaspora investors with verified, professional realtors across Lagos's most prestigious neighborhoods. This branch is the **legacy full-stack architecture**: a modern TanStack Start SSR frontend backed by a lightweight vanilla PHP REST API.

---

## What's on This Branch

| Layer | Stack | Description |
|---|---|---|
| **Frontend** | TanStack Start + Vite + React 19 | SSR web app: browsing, search, interactive map, agent directory, diaspora guide |
| **Backend** | Vanilla PHP 8.1 + PDO | REST API — auth, properties, agents, inquiries, uploads, settings, migrations |
| **Database** | MySQL 8 / MariaDB | `backend/database/schema.sql` + incremental `migrations/` |

> **Note:** the `next_js` branch contains the newer Next.js 15 full-stack port of this codebase. This branch (`main`) is maintained as the reference implementation.

---

## Features

### For Buyers & Renters
- **Property Listings** — Browse luxury properties for sale and rent in Lekki, Victoria Island, Ikoyi, Eko Atlantic, and Banana Island.
- **Interactive Map** — Explore listings on a custom SVG-based map of Lagos with hover previews.
- **Multi-Currency Pricing** — Toggle prices between NGN, USD, and GBP on every property card and detail page.
- **Mortgage Calculator** — Estimate monthly payments with adjustable deposit, interest rate, and loan term.
- **Save & Compare** — Bookmark properties and saved searches.
- **Agent Contact** — Reach agents directly via phone, email, or WhatsApp.
- **Diaspora Guide** — Dedicated resources for overseas Nigerians: virtual tours, verified titles, escrow protection, multi-currency options.
- **Viewing Requests** — Submit tour/viewing inquiries straight from a listing.

### For Agents & Realtors
- **Agent Directory** — Professional profiles with listing counts, languages, and contact details.
- **Verified Badge** — Trust signals for verified agent profiles.
- **Agent Portal API** — Listing CRUD, lead management, profile management, document verification, subscriptions, and wallet.
- **Recruitment Funnel** — Founding member early-access program for Lagos-based realtors.

### Platform & Back-Office
- **Admin API** — User/agent management, property verification approvals, settings, migration runner.
- **Payments** — Paystack integration (transactions, plans, customers, subscriptions, webhooks).
- **Media** — Multi-image upload with MIME validation and Cloudinary integration.
- **Security** — Custom HS256 JWT auth, role guards, bcrypt hashing, PDO prepared statements, CORS allow-list.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [TanStack Start](https://tanstack.com/start/latest) (SSR, file-based routing) |
| **Routing** | [TanStack Router](https://tanstack.com/router/latest) |
| **UI** | React 19 + [shadcn/ui](https://ui.shadcn.com/) (Radix primitives, New York style) |
| **Styling** | Tailwind CSS v4 + OKLCH design tokens + `tw-animate-css` |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Forms** | react-hook-form + Zod + @hookform/resolvers |
| **State** | @tanstack/react-query |
| **Frontend Build** | Vite v7 |
| **Frontend Language** | TypeScript (strict mode) |
| **Backend** | PHP 8.1+ (vanilla, zero Composer dependencies) |
| **Backend DB Layer** | PDO with prepared statements (`pdo_mysql`) |
| **Backend Auth** | Custom HS256 JWT (no external libraries) |
| **Database** | MySQL 8 / MariaDB, InnoDB + full-text search + foreign keys |
| **Package Manager** | [Bun](https://bun.sh/) |

---

## Repository Structure

```
.
├── src/                      # TanStack Start frontend
│   ├── assets/               # Static images
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives (60+ components)
│   │   ├── property-card.tsx
│   │   ├── search-bar.tsx
│   │   ├── site-header.tsx   # Header & footer
│   │   └── whatsapp-button.tsx
│   ├── hooks/                # Custom React hooks
│   ├── lib/
│   │   ├── api/              # Server functions + api-client
│   │   ├── properties.ts     # Property & agent types + data layer
│   │   ├── saved.ts          # localStorage helpers
│   │   └── utils.ts          # Tailwind class merging
│   ├── routes/               # File-based TanStack Router routes
│   │   ├── index.tsx         # Homepage
│   │   ├── properties.tsx    # Listing grid
│   │   ├── properties.$id.tsx# Property detail
│   │   ├── map.tsx           # Interactive map
│   │   ├── agents.tsx        # Agent directory
│   │   ├── about.tsx         # About page
│   │   ├── contact.tsx       # Contact page
│   │   ├── diaspora.tsx      # Diaspora investor guide
│   │   ├── insights.tsx      # Market insights
│   │   └── saved.tsx         # Saved properties
│   ├── router.tsx
│   ├── server.ts             # SSR server entry
│   ├── start.ts              # TanStack Start instance
│   └── styles.css            # Tailwind + custom theme
├── backend/                  # PHP REST API
│   ├── api/routes.php        # Route definitions
│   ├── config/               # database.php (PDO singleton), env.php
│   ├── controllers/          # Request handlers
│   ├── database/
│   │   ├── schema.sql        # Full schema + seed data
│   │   └── migrations/       # Incremental migration SQL files
│   ├── logs/                 # App logs
│   ├── middleware/           # AuthMiddleware.php, Cors.php
│   ├── models/               # Data access layer
│   ├── public/
│   │   ├── index.php         # Front controller
│   │   └── .htaccess         # Apache rewrite rules
│   ├── uploads/              # Uploaded property images
│   ├── utils/                # Response.php, Validator.php
│   └── .env.example          # Environment template
├── vercel.json               # Header / caching rules
├── vite.config.ts
├── vitest.config.ts
└── package.json
```

---

## Frontend — Getting Started

### Prerequisites
- [Bun](https://bun.sh/) v1.x or later
- Node.js v20+ (for VS Code tooling)

### Install & Run
```bash
bun install
bun run dev
```
Open [http://localhost:5173](http://localhost:5173).

### Build for Production
```bash
bun run build
bun run preview
```

### Lint & Format
```bash
bun run lint
bun run format
```

### Frontend Configuration
Point the app at the backend via `src/lib/api-client.ts`:
```env
VITE_API_URL=https://yourdomain.com
```
The API client injects the JWT bearer token, parses error envelopes, and falls back to static mock data when the backend is unreachable.

---

## Backend — Getting Started

Full documentation lives in [`backend/README.md`](backend/README.md).

### 1. Requirements
- PHP 8.1+ (`php -v`)
- MySQL 8 / MariaDB
- Apache with `mod_rewrite` (or PHP built-in server for local dev)

### 2. Configure
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env`:
```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=avr_homes
DB_USER=root
DB_PASS=your_password

APP_ENV=development
APP_URL=http://localhost:8000

JWT_SECRET=replace-with-a-random-64-char-string

UPLOAD_MAX_SIZE=10485760
ALLOWED_EXTENSIONS=jpg,jpeg,png,webp
```

### 3. Create database
```bash
mysql -u root -p < backend/database/schema.sql
```
**Default admin credentials:** `admin@avrhomes.ng` / `admin123` (change immediately).

### 4. Start dev server
```bash
php -S localhost:8000 -t backend/public
```

### 5. Verify
```bash
curl http://localhost:8000/api/health
```

---

## API Overview

All responses use the envelope `{ success, message, data, errors }`.

| Area | Example endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/refresh` |
| Agent auth | `POST /api/auth/agent/register`, `POST /api/auth/agent/login` |
| Properties | `GET/POST /api/properties`, `GET/PUT/DELETE /api/properties/{id}`, full-text `q` search, filters, pagination |
| Agents | `GET /api/agents`, `GET /api/agents/{id}`, `GET /api/agents/by-slug/{slug}` |
| Inquiries | `POST /api/inquiries`, `GET/DELETE /api/inquiries[/{id}]` |
| Contact | `POST /api/contact`, `GET/DELETE /api/contact[/{id}]` |
| Uploads | `POST /api/upload`, `POST /api/upload/gallery`, `DELETE /api/upload/{id}` |
| Agent portal | `GET/PUT /api/agent/profile`, `GET/POST /api/agent/listings`, `GET /api/agent/leads`, document verification |
| Admin | `GET /api/admin/verifications`, approve/reject, `POST /api/admin/migrations/run`, settings |
| Saved searches | CRUD `/api/saved-searches` |
| Settings | `GET/POST /api/settings` |
| Health | `GET /api/health` |

See [`backend/README.md`](backend/README.md) for the full endpoint reference with request/response examples.

### Authentication
```http
Authorization: Bearer <token>
Content-Type: application/json
```
- Custom HS256 JWT, 24-hour expiry, refresh-token flow.
- Role guards: `user`, `agent`, `superadmin`.
- Passwords hashed with bcrypt (`password_hash`).

---

## Database

Schema (14 tables): `users`, `agents`, `agent_subscriptions`, `agent_wallets`, `properties`, `property_images`, `inquiries`, `contact_messages`, `saved_searches`, `newsletter_subscribers`, `saved_properties`, `activity_logs`, `settings`, `migrations`.

- Full-text search on `properties.title`, `description`, `address`, `community`.
- Foreign keys enforce referential integrity (cascade / set-null on delete).
- Incremental changes go in `backend/database/migrations/*.sql`, executed via the admin migration runner.

---

## Deployment

### Frontend (Vercel)
1. Import the repository in Vercel — the framework preset picks up Vite/TanStack Start.
2. Set `VITE_API_URL` in the project environment.
3. Deploy. `vercel.json` applies caching and security headers.

### Backend (cPanel shared hosting)
1. Upload `backend/` to your cPanel document root (e.g. `public_html/api`).
2. Create the MySQL database in cPanel and import `database/schema.sql`.
3. Copy `.env.example` → `.env` and fill in credentials.
4. Ensure `public/` is the web root; update `.htaccess` `RewriteBase` and `APP_URL` if deployed as a subdirectory.
5. Make `uploads/` and `logs/` writable by the web server.

---

## Security Notes

- Change `JWT_SECRET` to a random 64+ char string before production.
- Change the default admin password after first login.
- All DB queries use PDO prepared statements — no raw SQL interpolation.
- Input validation via the custom `Validator` class (per-field rules).
- CORS restricted to known origins (`avrusthomes.com`, Vercel previews, local dev ports).
- Uploaded files validated server-side with `finfo`; extensions allow-listed.

---

## Testing

```bash
bun run test          # Vitest
bun run test:watch    # Watch mode
```

---

## Status

- [x] TanStack Start SSR frontend (browse, search, map, agents, diaspora guide).
- [x] Vanilla PHP REST API with JWT auth, role guards, validation, migrations.
- [x] Property/agent data consumed live from the API with graceful static fallback.
- [x] Agent portal + admin verification workflows.
- [ ] Full agent subscription / wallet UI in the frontend.
- [ ] See the `next_js` branch for the Next.js 15 re-implementation in active production use.

---

## Related Branches

- `main` — **This branch.** Legacy reference architecture (TanStack Start + PHP backend).
- `php_codes` — Identical tree; historical label for the PHP backend codebase.
- `next_js` — Next.js 15 full-stack port (active development + production).

---

## License

All rights reserved. Proprietary source code — not for redistribution without written consent.
