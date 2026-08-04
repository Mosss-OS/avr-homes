# AVR Homes — Next.js Port (Work In Progress)

This repository is being converted from a PHP backend + TanStack Router
frontend into a single Next.js 15 + TypeScript app on the `next_js` branch.
The entire PHP backend has been reimplemented as App Router route handlers;
the frontend pages are still being ported.

## Project layout

| Path | Status | Purpose |
|------|--------|---------|
| `backend/` | PHP legacy (reference only) | Original PHP controllers, router (`backend/api/routes.php`), migrations |
| `src/app/api/**/route.ts` | **COMPLETE (243 routes)** | Next.js App Router API — replaces `backend/` |
| `src/server/` | COMPLETE | Server helpers (db, auth, http, validator, response, paystack, cloudinary, csv, backup, notifications, models) |
| `src/app/` (pages), `src/components/*`, `src/lib/*`, `src/hooks/*`, `src/assets/*` | **NOT YET PORTED** | Frontend — old TanStack `src/routes/*` deleted, Next.js pages not written yet |

## Commands

- Server-layer typecheck (works even though frontend is unported):
  `npx tsc -p tsconfig.server-check.json` — currently passes with NO errors.
- Do NOT run repo-wide `npx tsc` or `next build` yet (frontend unported).
- Migration SQL: `backend/database/migrations/*.sql` (001–024 + seed/fix).

## Server helpers

| Module | Exports |
|--------|---------|
| `src/server/db.ts` | `query`, `fetchOne`, `fetchAll`, `execute` (`{insertId, affectedRows}`), `beginTransaction`/`txExecute`/`txFetchOne`/`commit`/`rollback`, `rawQuery`, `lastInsertId`, `closeDb` |
| `src/server/auth.ts` | `authenticate`, `tryAuthenticate`, `isUser`, `authenticateAgent`, `authenticateAdmin`, `requirePermission`, `generateToken`, `generateRefreshToken` |
| `src/server/http.ts` | `readJson` (`Record<string, any>`), `param` |
| `src/server/response.ts` | `success`, `error`, `json` |
| `src/server/validator.ts` | fluent `Validator` |
| `src/server/rate-limiter.ts` | `check`, `recordFailure`, `clear`, `getClientIp` |
| `src/server/paystack.ts` | `request`, `initializeTransaction`, `verifyTransaction`, `createPlan`, `createCustomer`, `createSubscription`, `disableSubscription`, `verifyWebhookSignature` |
| `src/server/cloudinary.ts` | upload/delete helpers |
| `src/server/notifications.ts` | `notify`, `sendEmail`, `naira` |
| `src/server/csv.ts` | `toCsv`, `outputCsv`, `parseCsv` |
| `src/server/backup.ts` | `createBackup`, `listBackups`, `getBackupPath` |
| `src/server/models/` | `agent.ts`, `property.ts`, `blog.ts` |

## Porting conventions

Read `docs/API_PORT_GUIDE.md` before touching API code. Key rules: one
`route.ts` per path; named `GET/PUT/POST/DELETE` exports only;
`export const runtime = "nodejs"`; Next 15 `await params`; `readJson(req)`
for bodies; positional `?` SQL placeholders; early `success`/`error`
returns; response shapes/messages/codes preserved verbatim.

## Data-model notes

- `agent_subscriptions.agent_id` = `users.id`; `agent_wallets.agent_id` =
  `users.id`; `wallet_transactions.wallet_id` = `agent_wallets.id`.
- `users.name` (not `full_name`).
- `agent_subscriptions` lives under `/api/agent/subscription/*`; use
  `txFetchOne` (not `txExecute`) for SELECTs inside transactions.
- Admin routes use `authenticateAdmin(req)` + `isUser(auth)`; agent routes use
  `authenticateAgent(req)` + `isUser(auth)`; agent id via `getAgentId(user)`.

## Known status

- All 243 routes from `backend/api/routes.php` are ported (199 route files).
- Coverage was verified with a Python scan of `routes.php` vs
  `src/app/api/**/route.ts`.
- `tsconfig.server-check.json` (project root) typechecks only the server
  layer; keep it clean.
- Frontend port is the remaining work.
