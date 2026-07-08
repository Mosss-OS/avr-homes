/**
 * Server-only configuration.
 *
 * The `.server.ts` suffix prevents Vite from bundling this file into the
 * client — values here never reach the browser.
 *
 * On Cloudflare Workers, env binds at **request** time. Module-scope reads
 * (e.g. `const x = process.env.X`) resolve to `undefined` because the env
 * object hasn't been provided yet. **Always read `process.env` inside a
 * function or handler.**
 *
 * Env-access patterns:
 * - `.server.ts` module (this file): wrappers that read `process.env`
 *   per-request.
 * - inline `process.env` inside a `createServerFn` handler: one-off reads.
 * - `import.meta.env.VITE_FOO`: **public** config readable from client +
 *   server (analytics IDs, public URLs). Never put secrets here.
 *
 * @module config.server
 */

import process from "node:process";

/**
 * Returns the current server-side configuration object.
 *
 * Because env reads happen inside this function, they resolve per-request
 * rather than being baked at module-scope (which would fail on Workers).
 */
export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    // Add server-only values here, e.g.:
    //   databaseUrl: process.env.DATABASE_URL,
    //   stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  };
}
