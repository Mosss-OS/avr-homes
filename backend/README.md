# AVR Homes — Backend API

RESTful PHP backend for [avrusthomes.com](https://avrusthomes.com). Zero framework dependencies — built with vanilla PHP 8+, PDO, and a simple file-based router.

## Tech stack

- **PHP 8.1+** with `pdo_mysql`, `mbstring`, `fileinfo`, `json` extensions
- **MySQL 8** with InnoDB, full-text search, foreign keys
- JWT authentication (custom HS256 implementation, no Composer packages)
- Frontend: TanStack Start SSR app deployed on Vercel

---

## Directory structure

```
backend/
  api/routes.php          # Route definitions
  config/
    database.php           # PDO connection (singleton)
    env.php                # .env loader
  controllers/             # Request handlers
  database/
    schema.sql             # Full schema + seed data
  logs/                    # App logs (gitkeep)
  middleware/
    AuthMiddleware.php     # JWT generation/validation
    Cors.php               # CORS headers
  models/                  # Data access layer
  public/
    index.php              # Entry point (front controller)
    .htaccess              # Apache rewrite rules
  uploads/
    properties/            # Uploaded property images
  utils/
    Response.php           # JSON response helpers
    Validator.php          # Input validation
  .env.example             # Environment template
```

---

## Quick start

### 1. Requirements

- PHP 8.1+ (`php -v`)
- MySQL 8 (`mysql --version`)
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

This creates the `avr_homes` database with 10 tables and seed data (3 agents, 1 admin user, default settings).

**Default admin credentials:**

| Email             | Password  |
|-------------------|-----------|
| admin@avrhomes.ng | admin123  |

### 4. Start dev server

```bash
php -S localhost:8000 -t backend/public
```

The API is now running at `http://localhost:8000`.

### 5. Verify

```bash
curl http://localhost:8000/api/health
```

Expected response:

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

## API reference

All endpoints return JSON with the envelope:

```json
{
  "success": true|false,
  "message": "Human-readable message",
  "data": { ... },
  "errors": { ... }
}
```

### Health

| Method | Path         | Auth | Description     |
|--------|--------------|------|-----------------|
| GET    | `/api/health` | No   | Server health check |

### Authentication

| Method | Path              | Auth | Description                 |
|--------|-------------------|------|-----------------------------|
| POST   | `/api/auth/login`  | No   | Login, returns JWT token   |
| POST   | `/api/auth/logout` | Yes  | Logout (logs activity)     |
| GET    | `/api/auth/me`     | Yes  | Current user info          |

**POST /api/auth/login**

```json
{ "email": "admin@avrhomes.ng", "password": "admin123" }
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": 1, "name": "Admin", "email": "admin@avrhomes.ng", "role": "superadmin" }
  }
}
```

Pass the token as a `Bearer` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Tokens expire after 24 hours.

### Properties

| Method | Path                   | Auth  | Description                     |
|--------|------------------------|-------|---------------------------------|
| GET    | `/api/properties`      | No    | List properties (paginated)    |
| GET    | `/api/properties/{id}` | No    | Single property with images    |
| POST   | `/api/properties`      | Yes   | Create property                |
| PUT    | `/api/properties/{id}` | Yes   | Update property                |
| DELETE | `/api/properties/{id}` | Yes   | Delete property                |

#### GET /api/properties

**Query parameters:**

| Param       | Type   | Example      | Description                       |
|-------------|--------|--------------|-----------------------------------|
| page        | int    | 1            | Page number                       |
| per_page    | int    | 12           | Items per page (max 50)           |
| sort        | string | price        | Field: price, created_at, title, area, beds |
| order       | string | asc          | asc or desc                       |
| purpose     | string | buy          | buy, rent                         |
| type        | string | apartment    | apartment, villa, townhouse, penthouse, studio |
| city        | string | Lagos        | City filter (LIKE)                |
| community   | string | Lekki        | Community filter (LIKE)           |
| min_price   | int    | 10000000     | Minimum price (NGN)               |
| max_price   | int    | 1000000000   | Maximum price (NGN)               |
| beds        | int    | 3            | Minimum bedrooms                  |
| baths       | int    | 2            | Minimum bathrooms                 |
| featured    | int    | 1            | Featured listings only            |
| q           | string | Lekki villa  | Full-text search (title, description, address, community) |
| ids         | string | 1,2,3        | Comma-separated list of property IDs |

**Response:**

```json
{
  "success": true,
  "data": {
    "data": [{ ... }],
    "total": 42,
    "page": 1,
    "per_page": 12,
    "total_pages": 4
  }
}
```

#### Property object (full):

```json
{
  "id": 1,
  "title": "Skyline Penthouse with Lagos Lagoon Views",
  "slug": "skyline-penthouse-with-lagos-lagoon-views",
  "description": "A rare full-floor penthouse...",
  "type": "penthouse",
  "purpose": "buy",
  "price": 950000000,
  "beds": 4,
  "baths": 5,
  "area": 380,
  "city": "Lagos",
  "community": "Eko Atlantic",
  "address": "Eko Pearl Towers, Eko Atlantic City",
  "lat": "6.4204000",
  "lng": "3.4106000",
  "image": null,
  "amenities": ["Private pool", "Concierge", "Smart home", "Covered parking", "Gym"],
  "agent_id": 1,
  "featured": true,
  "is_verified": true,
  "is_active": true,
  "posted_days_ago": 0,
  "meta_title": null,
  "meta_description": null,
  "created_at": "2026-01-15 10:30:00",
  "updated_at": "2026-01-15 10:30:00",
  "agent_name": "Adaeze Okafor",
  "agent_agency": "AVR Homes",
  "agent_phone": "+234 802 123 4567",
  "agent_email": "adaeze@avrhomes.ng",
  "agent_avatar_hue": 195,
  "agent_languages": ["English", "Igbo"],
  "agent_is_verified": true,
  "images": [
    {
      "id": 1,
      "file_path": "uploads/properties/prop_abc123.jpg",
      "file_name": "photo.jpg",
      "is_primary": true,
      "sort_order": 0,
      "url": "http://localhost:8000/uploads/properties/prop_abc123.jpg"
    }
  ]
}
```

### Agents

| Method | Path                | Auth | Description              |
|--------|---------------------|------|--------------------------|
| GET    | `/api/agents`       | No   | List all agents          |
| GET    | `/api/agents/{id}`  | No   | Single agent + listings  |

### Inquiries (Viewing Requests)

| Method | Path                 | Auth | Description                |
|--------|----------------------|------|----------------------------|
| POST   | `/api/inquiries`     | No   | Submit a viewing request   |
| GET    | `/api/inquiries`     | Yes  | List inquiries (paginated) |
| DELETE | `/api/inquiries/{id}`| Yes  | Delete an inquiry          |

**POST /api/inquiries**

```json
{
  "name": "Chidi Obi",
  "email": "chidi@example.com",
  "phone": "+234 812 345 6789",
  "message": "I'd like to schedule a viewing for Skyline Penthouse.",
  "property_id": 1
}
```

`property_id` is optional.

### Contact Messages

| Method | Path                 | Auth  | Description                  |
|--------|----------------------|-------|------------------------------|
| POST   | `/api/contact`       | No    | Submit a contact message     |
| GET    | `/api/contact`       | Yes   | List messages (paginated)    |
| DELETE | `/api/contact/{id}`  | Yes   | Delete a message             |

**POST /api/contact**

```json
{
  "name": "Chidi Obi",
  "email": "chidi@example.com",
  "phone": "+234 812 345 6789",
  "enquiry_type": "Buy",
  "message": "I'm looking for a 3-bedroom apartment in Lekki."
}
```

Valid `enquiry_type` values: `Buy`, `Rent`, `Agent Enquiry`, `Developer Partnership`, `Media`, `Other`.

### Uploads

| Method | Path                  | Auth | Description                      |
|--------|-----------------------|------|----------------------------------|
| POST   | `/api/upload`         | Yes  | Upload single image              |
| POST   | `/api/upload/gallery` | Yes  | Upload multiple images (gallery) |
| DELETE | `/api/upload/{id}`    | Yes  | Delete an image                  |

Upload via `multipart/form-data`:

- Single: field name `file`
- Gallery: field name `files[]`
- Optional fields: `property_id` (int), `is_primary` (1/0)

Accepted: `jpg`, `jpeg`, `png`, `webp` — max 10 MB per file. MIME validated server-side via `finfo`.

### Settings

| Method | Path              | Auth  | Description           |
|--------|-------------------|-------|-----------------------|
| GET    | `/api/settings`   | No    | Get all settings      |
| POST   | `/api/settings`   | Yes   | Update settings (key-value JSON object) |

Default settings:
- `site_name` — AVR Homes
- `site_tagline` — Lagos Luxury, Verified.
- `contact_email` — hello@avrhomes.ng
- `contact_phone` — +234 800 000 0000
- `currency_ngn_usd` — 0.00067
- `currency_ngn_gbp` — 0.00053
- `whatsapp_number` — 2348000000000

### Token Refresh

| Method | Path                | Auth | Description                              |
|--------|---------------------|------|------------------------------------------|
| POST   | `/api/auth/refresh` | No   | Refresh an expired JWT using refresh token |

**POST /api/auth/refresh**

```json
{ "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Agent Authentication

| Method | Path                          | Auth | Description                    |
|--------|-------------------------------|------|--------------------------------|
| POST   | `/api/auth/agent/register`    | No   | Register a new agent account   |
| POST   | `/api/auth/agent/login`       | No   | Agent login, returns JWT + profile |

**POST /api/auth/agent/register**

```json
{
  "name": "Chidi Obi",
  "email": "chidi@example.com",
  "password": "securepass123",
  "phone": "+234 812 345 6789",
  "agency": "Luxury Homes Ltd.",
  "whatsapp": "+234 812 345 6789",
  "bio": "Experienced Lagos realtor...",
  "experience": "6-10",
  "state": "Lagos",
  "city": "Lekki",
  "languages": ["English", "Igbo"],
  "property_types": ["apartment", "villa"],
  "specialization": ["luxury", "commercial"],
  "social_instagram": "@chidi_realtor",
  "referral_source": "Google"
}
```

On success, returns JWT token, refresh token, and user object. Also creates a `free` tier subscription and wallet.

**POST /api/auth/agent/login**

```json
{ "email": "chidi@example.com", "password": "securepass123" }
```

Response includes agent profile:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "...",
    "user": {
      "id": 2, "name": "Chidi Obi", "email": "chidi@example.com", "role": "agent",
      "profile": {
        "agent_id": 1, "slug": "chidi-obi", "photo_url": null,
        "agency": "Luxury Homes Ltd.", "phone": "+234 812 345 6789",
        "is_verified": false, "avatar_hue": 195
      }
    }
  }
}
```

### Agent Public

| Method | Path                         | Auth | Description                       |
|--------|------------------------------|------|-----------------------------------|
| GET    | `/api/agents/by-slug/{slug}` | No   | Single agent by URL slug          |

### Agent Profile Management

All endpoints require agent JWT auth.

| Method | Path                     | Auth  | Description                        |
|--------|--------------------------|-------|------------------------------------|
| GET    | `/api/agent/profile`     | Yes   | Get authenticated agent's profile  |
| PUT    | `/api/agent/profile`     | Yes   | Update agent profile fields        |
| POST   | `/api/agent/profile/avatar` | Yes | Upload avatar image                |

**PUT /api/agent/profile** — accepts partial update. Validated fields: `name`, `phone`, `experience`, `avg_monthly_listings`, `avg_deal_size`, plus any agent column.

**POST /api/agent/profile/avatar** — `multipart/form-data` with field `avatar`. Accepted: `jpg`, `jpeg`, `png`, `webp` (max 5 MB). Returns `{ "photo_url": "..." }`.

### Agent Listings (Authenticated Agent)

All endpoints require agent JWT auth.

| Method | Path                               | Auth | Description                         |
|--------|------------------------------------|------|-------------------------------------|
| GET    | `/api/agent/listings`              | Yes  | List agent's own listings (paginated) |
| POST   | `/api/agent/listings`              | Yes  | Create a new listing                |
| GET    | `/api/agent/listings/stats`        | Yes  | Listing statistics (counts by status) |
| GET    | `/api/agent/listings/{id}`         | Yes  | Single listing detail               |
| PUT    | `/api/agent/listings/{id}`         | Yes  | Update listing                      |
| PUT    | `/api/agent/listings/{id}/status`  | Yes  | Change listing status (draft/publish/archive) |
| DELETE | `/api/agent/listings/{id}`         | Yes  | Delete listing                      |

**Query params (GET /api/agent/listings):** `page`, `per_page`, `status` (draft/published/archived), `q` (search).

**POST /api/agent/listings** — accepts property fields (title, description, type, purpose, price, beds, baths, area, city, community, address, lat, lng, amenities as JSON array).

### Agent Leads

All endpoints require agent JWT auth.

| Method | Path                              | Auth | Description                          |
|--------|-----------------------------------|------|--------------------------------------|
| GET    | `/api/agent/leads`                | Yes  | List leads (viewing requests)        |
| GET    | `/api/agent/leads/unread-count`   | Yes  | Count of unread leads                |
| GET    | `/api/agent/leads/{id}`           | Yes  | Single lead detail                   |
| PUT    | `/api/agent/leads/{id}/read`      | Yes  | Mark lead as read                    |
| PUT    | `/api/agent/leads/{id}/status`    | Yes  | Update lead status                   |
| PUT    | `/api/agent/leads/{id}/notes`     | Yes  | Add/update agent notes on lead       |

**Query params (GET /api/agent/leads):** `page`, `per_page`, `status` (new/contacted/qualified/closed), `property_id`, `date_from`, `date_to`, `search`.

**PUT /api/agent/leads/{id}/status** — body: `{ "status": "contacted" }`. Valid statuses: `new`, `contacted`, `qualified`, `closed`.

**PUT /api/agent/leads/{id}/notes** — body: `{ "notes": "Called client, interested in viewing Saturday." }`.

### Property Verification (Agent)

| Method | Path                                          | Auth | Description                               |
|--------|-----------------------------------------------|------|-------------------------------------------|
| POST   | `/api/agent/listings/{id}/documents`          | Yes  | Upload verification document for a listing |
| GET    | `/api/agent/listings/{id}/verification`       | Yes  | Get verification status + submitted docs   |

**POST /api/agent/listings/{id}/documents** — `multipart/form-data` with field `document`, plus `document_type` field. Valid types: `certificate_of_occupancy`, `survey_plan`, `deed_of_assignment`, `governors_consent`, `agent_lasrera_id`, `property_photo`.

### Admin Verification

Requires admin JWT auth.

| Method | Path                                    | Auth  | Description                             |
|--------|-----------------------------------------|-------|-----------------------------------------|
| GET    | `/api/admin/verifications`              | Yes   | List all pending verifications          |
| PUT    | `/api/admin/verifications/{id}/approve` | Yes   | Approve a verification request          |
| PUT    | `/api/admin/verifications/{id}/reject`  | Yes   | Reject a verification request           |

**Query params (GET /api/admin/verifications):** `status` (pending/approved/rejected), `page`, `per_page`.

### Saved Searches

Requires authenticated user JWT.

| Method | Path                        | Auth | Description                    |
|--------|-----------------------------|------|--------------------------------|
| GET    | `/api/saved-searches`       | Yes  | List user's saved searches     |
| POST   | `/api/saved-searches`       | Yes  | Save a search                  |
| PUT    | `/api/saved-searches/{id}`  | Yes  | Update saved search            |
| DELETE | `/api/saved-searches/{id}`  | Yes  | Delete saved search            |

**POST /api/saved-searches**

```json
{
  "name": "3-bed Lekki buy",
  "filters": { "purpose": "buy", "beds": 3, "city": "Lekki" },
  "alert_enabled": true
}
```

### Migrations (Admin)

| Method | Path                              | Auth  | Description                   |
|--------|-----------------------------------|-------|-------------------------------|
| POST   | `/api/admin/migrations/run`       | Yes   | Run all pending migrations    |
| POST   | `/api/admin/migrations/run/{name}`| Yes   | Run a specific migration file |
| GET    | `/api/admin/migrations/status`    | Yes   | List executed migrations      |

Migration files are `.sql` files in `backend/database/migrations/`. Already-executed migrations are skipped unless specifically requested (returns 409 conflict).

---

## Authentication

All admin and agent CRUD endpoints require a JWT Bearer token. Obtain one via `POST /api/auth/login` or `POST /api/auth/agent/login`.

Token format: custom HS256 JWT (header.payload.signature). No external JWT library required.

**Headers for authenticated requests:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

For GET requests, the token can also be passed as a query parameter: `?token=<token>`.

---

## Database schema

14 tables:

| Table                  | Rows (seed) | Purpose                              |
|------------------------|-------------|--------------------------------------|
| users                  | 1           | Admin and agent accounts             |
| agents                 | 3           | Real estate agent profiles           |
| agent_subscriptions    | 3           | Agent subscription tiers & limits    |
| agent_wallets          | 3           | Agent earnings and balances          |
| properties             | 0           | Property listings                    |
| property_images        | 0           | Image gallery per property           |
| inquiries              | 0           | Viewing / tour requests              |
| contact_messages       | 0           | Contact form submissions             |
| saved_searches         | 0           | User-saved search filters            |
| newsletter_subscribers | 0           | Email subscribers                    |
| saved_properties       | 0           | User-favourited properties           |
| activity_logs          | 0           | Admin action audit trail             |
| settings               | 7           | Key-value site settings              |
| migrations             | 0           | Executed migration tracking          |

Full-text search is enabled on `properties.title`, `properties.description`, `properties.address`, and `properties.community`.

Foreign keys enforce referential integrity:
- `properties.agent_id` → `agents.id` (SET NULL on delete)
- `property_images.property_id` → `properties.id` (CASCADE on delete)
- `inquiries.property_id` → `properties.id` (SET NULL on delete)
- `saved_properties.user_id` → `users.id` (CASCADE on delete)
- `saved_properties.property_id` → `properties.id` (CASCADE on delete)
- `activity_logs.user_id` → `users.id` (SET NULL on delete)

---

## CORS

Allowed origins (from `middleware/Cors.php`):

```
http://localhost:8080
http://localhost:5173
http://127.0.0.1:8080
http://127.0.0.1:5173
https://avrusthomes.com
https://www.avrusthomes.com
https://avr-homes.vercel.app
```

Preflight (OPTIONS) requests are handled automatically with 204 response and proper headers.

---

## Deployment (cPanel shared hosting)

1. Upload the `backend/` directory to your cPanel document root (e.g., `public_html/api`).
2. Set up a **MySQL database** in cPanel and import `database/schema.sql`.
3. Copy `.env.example` to `.env` and fill in the database credentials.
4. Ensure `public/` is the web root. If deploying as a subdirectory:
   - Update `.htaccess` `RewriteBase` if needed
   - Set `APP_URL` in `.env` to the full URL (e.g., `https://yourdomain.com/api`)
5. Make sure the `uploads/` and `logs/` directories are writable by the web server.

**Important:** Apache's `mod_rewrite` must be enabled. The `.htaccess` file routes all non-file requests to `index.php`.

If `mod_rewrite` is not available, the framework can still work with query-based routing: `index.php?_url=/api/properties`.

---

## Local development (without Apache)

```bash
php -S localhost:8000 -t backend/public
```

The built-in server respects the `.htaccess` rules implicitly (PHP routes all non-file requests to `index.php`).

---

## Security notes

- Change `JWT_SECRET` in `.env` to a random 64+ character string before production.
- Change the default admin password after first login.
- Uploaded files are stored outside the web root pattern — served via a URL builder in the Property model. Ensure `uploads/` is not directly browsable.
- All database queries use PDO prepared statements — no raw SQL interpolation.
- Input validation uses the custom `Validator` class with per-field rules.
- CORS is restricted to known origins.
- Passwords are hashed with `password_hash()` using bcrypt.

---

## Frontend integration

The frontend (TanStack Start SSR app) communicates with this API via `src/lib/api-client.ts`.

**Setup in frontend `.env`:**

```env
VITE_API_URL=https://yourdomain.com
```

The `api-client.ts` wrapper handles:
- JSON serialization/deserialization
- Bearer token injection (stored in `localStorage`)
- Error response parsing
- Content-Type headers

Every frontend route that displays property, agent, or inquiry data now fetches from this API with a graceful fallback to static mock data when the backend is unreachable.

---

## Error handling

All errors return JSON:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": {
    "email": ["Email is required.", "Email must be a valid address."]
  }
}
```

HTTP status codes used:
- `200` — Success
- `201` — Created
- `400` — Bad request (missing/invalid input)
- `401` — Unauthenticated
- `404` — Resource not found
- `422` — Validation failed
- `500` — Internal server error

In `development` mode, PDO and PHP errors include the actual error message. In `production`, generic messages are returned.
