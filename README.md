# AVR Homes — PHP Backend

> **Lagos Luxury, Verified.** — A premium real estate marketplace for luxury properties in Lagos, Nigeria.

This branch is the **PHP backend codebase** for AVR Homes. It contains the vanilla PHP 8.1 REST API and the full MySQL database schema/migrations that power the platform, alongside the TanStack Start frontend that consumes it. The API is the source of truth for every feature: authentication, property listings, agent profiles, inquiries, uploads, subscriptions, wallets, and admin operations.

---

## What's on This Branch

| Layer | Stack | Description |
|---|---|---|
| **Backend** | Vanilla PHP 8.1 + PDO | REST API with zero Composer dependencies, custom HS256 JWT auth |
| **Database** | MySQL 8 / MariaDB | `backend/database/schema.sql` + incremental `migrations/` |
| **Frontend** | TanStack Start + Vite + React 19 | SSR app that consumes the API via `src/lib/api-client.ts` |

> **Note:** this branch tracks the `main` architecture. The `next_js` branch contains the newer Next.js 15 full-stack port of this same backend.

---

## Backend Features

### Core API
- **Authentication** — Register, login, logout, `me`, refresh tokens; custom HS256 JWT, 24h expiry.
- **Agent Auth** — Agent registration/login with profile creation, free-tier subscription + wallet bootstrap.
- **Properties** — Full CRUD with pagination, filtering, sorting, and MySQL full-text search (`title`, `description`, `address`, `community`).
- **Agents** — Directory listing, detail with listings, and slug-based public profiles.
- **Inquiries & Contact** — Viewing requests and contact messages with admin listing/delete.
- **Uploads** — Single + gallery image uploads with `finfo` MIME validation and extension allow-list.

### Agent Portal
- **Profile** — Read/update agent profile, avatar upload.
- **Listings** — Create/update/delete listings, stats, status workflow (draft → published → archived).
- **Leads** — Lead inbox with unread counts, status pipeline (new → contacted → qualified → closed), notes.
- **Verification** — Upload listing verification documents (C of O, survey plan, deed of assignment, governor's consent, LASRERA ID).
- **Subscriptions & Wallets** — Tiered subscription limits and earnings wallets.

### Admin
- **Verifications** — List pending, approve, or reject property verification requests.
- **Migrations** — Run all or individual migration files; status tracking.
- **Settings** — Read/update key-value site settings.

### Platform Integrations
- **Paystack** — Transactions, plans, customers, subscriptions, webhooks.
- **Cloudinary** — Media pipeline integration.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Language** | PHP 8.1+ (`pdo_mysql`, `mbstring`, `fileinfo`, `json`) |
| **Routing** | Custom file-based router (`backend/api/routes.php`) |
| **DB Layer** | PDO with prepared statements — no raw SQL interpolation |
| **Auth** | Custom HS256 JWT (header.payload.signature, no external libs) |
| **Validation** | Custom `Validator` class (email, phone, length, numeric, required, etc.) |
| **Responses** | `{ success, message, data, errors }` envelope |
| **Database** | MySQL 8 / MariaDB, InnoDB, full-text indexes, foreign keys |
| **Frontend** | TanStack Start SSR + React 19 + Tailwind CSS v4 (shadcn/ui) |
| **Frontend Build** | Vite v7, TypeScript strict, Bun package manager |

---

## Repository Structure

```
├── backend/                  # PHP REST API
│   ├── api/routes.php        # Route definitions (auth, properties, agents, admin, ...)
│   ├── config/
│   │   ├── database.php      # PDO connection (singleton)
│   │   └── env.php           # .env loader
│   ├── controllers/          # Request handlers
│   ├── database/
│   │   ├── schema.sql        # Full schema + seed data
│   │   └── migrations/       # Incremental migration SQL files
│   ├── logs/                 # App logs (gitkeep)
│   ├── middleware/
│   │   ├── AuthMiddleware.php# JWT generation/validation
│   │   └── Cors.php          # CORS allow-list + preflight
│   ├── models/               # Data access layer
│   ├── public/
│   │   ├── index.php         # Front controller
│   │   └── .htaccess         # Apache rewrite rules
│   ├── uploads/
│   │   └── properties/       # Uploaded property images
│   ├── utils/
│   │   ├── Response.php      # JSON response helpers
│   │   └── Validator.php     # Input validation
│   └── .env.example          # Environment template
└── src/                      # TanStack Start frontend (see README on `main`)
    ├── routes/               # SSR routes (home, properties, map, agents, contact, diaspora, ...)
    ├── components/           # shadcn/ui + app components
    └── lib/api-client.ts     # API client (JWT injection, error parsing, static fallback)
```

---

## Getting Started

### 1. Requirements
- PHP 8.1+ (`php -v`)
- MySQL 8 / MariaDB (`mysql --version`)
- Apache with `mod_rewrite` **or** PHP built-in server for local dev

### 2. Clone & configure
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
This creates the `avr_homes` database with the full schema and seed data.

**Default admin credentials:** `admin@avrhomes.ng` / `admin123` — change immediately.

### 4. Start dev server
```bash
php -S localhost:8000 -t backend/public
```
The API is now running at `http://localhost:8000`.

### 5. Verify
```bash
curl http://localhost:8000/api/health
```
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "status": "ok",
    "time": "2026-01-15T10:30:00+00:00",
    "php": "8.2.0"
  }
}
```

---

## API Overview

All responses use the envelope `{ success, message, data, errors }`.

| Area | Example endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/refresh` |
| Agent auth | `POST /api/auth/agent/register`, `POST /api/auth/agent/login` |
| Properties | `GET/POST /api/properties`, `GET/PUT/DELETE /api/properties/{id}`, full-text `q` search |
| Agents | `GET /api/agents`, `GET /api/agents/{id}`, `GET /api/agents/by-slug/{slug}` |
| Inquiries | `POST /api/inquiries`, `GET/DELETE /api/inquiries[/{id}]` |
| Contact | `POST /api/contact`, `GET/DELETE /api/contact[/{id}]` |
| Uploads | `POST /api/upload`, `POST /api/upload/gallery`, `DELETE /api/upload/{id}` |
| Agent portal | `GET/PUT /api/agent/profile`, `GET/POST /api/agent/listings`, `GET /api/agent/leads`, `POST .../documents`, `GET .../verification` |
| Admin | `GET /api/admin/verifications`, approve/reject, `POST /api/admin/migrations/run`, settings |
| Saved searches | CRUD `/api/saved-searches` |
| Health | `GET /api/health` |

See [`backend/README.md`](backend/README.md) for the complete endpoint reference with request/response examples.

### Authentication
```http
Authorization: Bearer <token>
Content-Type: application/json
```
- Custom HS256 JWT, 24-hour expiry, refresh-token flow.
- Role guards: `user`, `agent`, `superadmin`.
- Passwords hashed with bcrypt (`password_hash`).

---

## Database Schema

14 tables: `users`, `agents`, `agent_subscriptions`, `agent_wallets`, `properties`, `property_images`, `inquiries`, `contact_messages`, `saved_searches`, `newsletter_subscribers`, `saved_properties`, `activity_logs`, `settings`, `migrations`.

- Full-text search enabled on `properties.title`, `description`, `address`, `community`.
- Foreign keys: `properties.agent_id → agents.id`, `property_images.property_id → properties.id`, `inquiries.property_id → properties.id`, `saved_properties.user_id → users.id`, `activity_logs.user_id → users.id` (CASCADE / SET NULL semantics).
- Schema changes are additive and shipped as `migrations/*.sql`, executed through the admin migration runner.

---

## Deployment (cPanel shared hosting)

1. Upload the `backend/` directory to your cPanel document root (e.g., `public_html/api`).
2. Set up a **MySQL database** in cPanel and import `database/schema.sql`.
3. Copy `.env.example` → `.env` and fill in the database credentials.
4. Ensure `public/` is the web root. If deploying as a subdirectory:
   - Update `.htaccess` `RewriteBase` if needed
   - Set `APP_URL` in `.env` to the full URL (e.g., `https://yourdomain.com/api`)
5. Make sure the `uploads/` and `logs/` directories are writable by the web server.

**Important:** Apache `mod_rewrite` must be enabled. The `.htaccess` routes all non-file requests to `index.php`. Without it, query-based routing still works: `index.php?_url=/api/properties`.

---

## Security Notes

- Change `JWT_SECRET` in `.env` to a random 64+ character string before production.
- Change the default admin password after first login.
- All database queries use PDO prepared statements — no raw SQL interpolation.
- Input validation uses the custom `Validator` class with per-field rules.
- CORS is restricted to known origins (`avrusthomes.com`, Vercel previews, local dev ports).
- Uploaded files validated server-side via `finfo`; extensions allow-listed (jpg, jpeg, png, webp, max 10 MB).
- Passwords hashed with bcrypt.

---

## Error Handling

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": {
    "email": ["Email is required.", "Email must be a valid address."]
  }
}
```

HTTP codes: `200` success · `201` created · `400` bad request · `401` unauthenticated · `404` not found · `422` validation failed · `500` server error. In `development` mode, PDO/PHP error details are surfaced; in `production`, generic messages are returned.

---

## Related Branches

- `php_codes` — **This branch.** PHP backend codebase (reference implementation).
- `main` — Identical tree; legacy full-stack reference (TanStack frontend + PHP backend).
- `next_js` — Next.js 15 full-stack port (active development + production).

---

## License

All rights reserved. Proprietary source code — not for redistribution without written consent.
