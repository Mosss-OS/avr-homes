# API Porting Guide (PHP → Next.js Route Handlers)

This guide defines the exact conventions for porting the legacy PHP backend
(`backend/controllers/*.php`) into Next.js route handlers
(`src/app/api/**/route.ts`). **Follow this guide exactly.** Refer to the
already-ported files as canonical examples before writing any code.

## Reference files — READ FIRST

| Topic | File |
|-------|------|
| Working example | `src/app/api/auth/agent/register/route.ts`, `src/app/api/auth/login/route.ts` |
| Working example | `src/app/api/properties/route.ts`, `src/app/api/properties/[id]/route.ts` |
| Model example | `src/server/models/agent.ts`, `src/server/models/property.ts` |
| DB helpers | `src/server/db.ts` (`query`, `fetchOne`, `fetchAll`, `execute`, `beginTransaction`, `txQuery`, `txExecute`, `commit`, `rollback`) |
| Response helpers | `src/server/response.ts` (`success`, `error`, `json`) |
| Auth helpers | `src/server/auth.ts` (`authenticate`, `authenticateAgent`, `authenticateAdmin`, `tryAuthenticate`, `isUser`, `generateToken`, `generateRefreshToken`, `requirePermission`) |
| Request helpers | `src/server/http.ts` (`readJson`, `param`) |
| Validation | `src/server/validator.ts` (fluent `Validator`) |
| Rate limiting | `src/server/rate-limiter.ts` (`check`, `recordFailure`, `clear`, `getClientIp`) |
| Payments | `src/server/paystack.ts` |
| Cloudinary | `src/server/cloudinary.ts` |
| Email | `src/server/notifications.ts`, `src/server/smtp.ts` |
| Image optimizer | `src/server/image-optimizer.ts` (`optimize`, `isAvailable`) |

## Route → file mapping

A PHP route `PUT /api/agent/listings/{id}` becomes a file at:

```
src/app/api/agent/listings/[id]/route.ts
```

Rules:
- Path segments before the trailing dynamic part become directories; the
  final dynamic `{id}` (or `{slug}` / `{period}` / `{inquiry_id}` /
  `{membership_id}` / `{propertyId}` / `{name}`) becomes `[id]` / `[slug]` /
  etc. Keep a matching segment name so the code is readable.
- All HTTP verbs for one path live in the same `route.ts` file.
- Nested dynamic segments (e.g. `/api/admin/withdrawals/{id}/approve`) become
  `api/admin/withdrawals/[id]/approve/route.ts`.

## Handler signature

```ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;          // await params in Next 15
  const idNum = Number(id);
  // ...
}
```

For routes without a dynamic segment the second argument is omitted. Query
params come from `req.nextUrl.searchParams` (a `URLSearchParams`).

## PHP → TypeScript translation rules

1. **Read input** — `json_decode(file_get_contents('php://input'))` becomes
   `const input = await readJson(req)` which returns `Record<string, any>`.
   Always use `readJson(req)` (never `req.json()` directly) so field reads
   and the `in` operator type-check cleanly.
2. **Validation** — same fluent API:
   ```ts
   const validator = new Validator(input);
   validator.required("email", "Email").email("email", "Email");
   if (validator.fails()) return error("Validation failed", 422, validator.getErrors());
   const data = validator.validated();
   ```
3. **Response** — `Response::success($x, $msg, 201)` becomes
   `return success(x, msg, 201)`. `Response::error($msg, $code, $errors)`
   becomes `return error(msg, code, errors)`. **Always return early** — PHP
   stopped execution on error, TypeScript does not.
4. **Auth** — `$user = AuthMiddleware::authenticate()` becomes:
   ```ts
   const auth = await authenticate(req);
   if (!isUser(auth)) return auth as NextResponse;   // auth is already the error response
   const user = auth as AuthUser;
   ```
   - `authenticateAgent(req)` → same pattern.
   - `authenticateAdmin(req)` → same pattern.
   - `AuthMiddleware::requirePermission($slug)` →
     `const pr = await requirePermission(req, "slug"); if (!isUser(pr)) return pr as NextResponse;`
   - Use `user.id`, `user.role`, `user.agent_id`.
5. **Client IP** — `$_SERVER['REMOTE_ADDR']` → `getClientIp(req)`.
6. **SQL** — replace PDO named placeholders (`:name`) with positional `?`
   and pass a JS array in the **exact order the placeholders appear in the
   SQL string**. Use `fetchOne`/`fetchAll` for SELECT, `execute` for
   INSERT/UPDATE/DELETE (returns `{ insertId, affectedRows }`).
7. **Transactions** —
   ```ts
   const conn = await beginTransaction();
   try {
     await conn.execute(sql, params);
     // or: const [rows] = await conn.execute(...)
     await commit(conn);
   } catch (err) {
     await rollback(conn).catch(() => {});
     return error("message: " + (err as Error).message, 500);
   }
   ```
   `conn.execute` returns `[rows, fields]` like mysql2 — use
   `(result as any)[0]?.insertId` when you need an insert id, or import the
   `txExecute` helper.
8. **Passwords** — `password_hash($pw, PASSWORD_BCRYPT, ['cost'=>12])` →
   `bcrypt.hashSync(String(pw), 12)`; `password_verify($pw, $hash)` →
   `bcrypt.compareSync(String(pw), hash)`. Import `bcrypt` from "bcryptjs".
9. **JSON columns** — `json_encode($arr)` → `JSON.stringify(arr)` (use
   `JSON.stringify(data.field ?? [])`); `json_decode($s, true)` →
   parse defensively (empty/null → fallback). For reads, cast scalars to
   numbers/booleans exactly as the PHP model did (`Number(x)`, `Boolean(x)`).
10. **Rand** — `rand(0, 360)` → `Math.floor(Math.random() * 361)`.
11. **Route params** — `$params['id']` → `Number(id)` from awaited params.
    Validate `<= 0` → `return error("Invalid ... ID", 400)`.
12. **Ownership / duplicate helpers** — port private static helpers inline in
    the route file (see `ownsProperty` in `src/app/api/properties/[id]/route.ts`).
13. **Keep messages, codes, and response shapes identical** — the frontend
    depends on them (e.g. `data.token`, `data.user`, `data.data`).

## Verification

Do NOT run `npx tsc --noEmit` over the whole repo (the frontend is still
being ported and will show unrelated errors). Instead, sanity-check your
files by re-reading them and comparing against the reference routes. Keep
imports to modules that already exist. Do not create new server helpers
unless strictly necessary — reuse `db.ts`, `response.ts`, `auth.ts`,
`validator.ts`, `http.ts`, `rate-limiter.ts`, `cloudinary.ts`, `paystack.ts`,
`notifications.ts`, and `src/server/models/*`.
