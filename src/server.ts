/**
 * Server-side fetch handler for the Cloudflare Workers / SSR environment.
 *
 * Attaches the global error-capture listeners, dynamically imports the
 * TanStack React Start server entry, and normalises catastrophic SSR
 * failures (h3-swallowed HTTP errors) into a user-facing error page.
 *
 * @module server
 */

import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

/**
 * Minimal interface for the dynamically imported server entry module.
 */
type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

/**
 * Lazily loads and caches the TanStack React Start server entry module.
 * Subsequent calls return the same promise (singleton).
 */
async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
/**
 * Detects and replaces h3-swallowed 500 responses that h3 produces when a
 * handler throws an HTTPError. These responses are JSON with
 * `{"unhandled":true,"message":"HTTPError"}` — try/catch alone cannot
 * intercept them. The original Error is recovered from the capture buffer
 * and a user-facing HTML error page is returned instead.
 */
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/**
 * Default export — the Cloudflare Workers fetch handler.
 *
 * Resolves the server entry, delegates the request, and catches any
 * remaining errors to render a safe HTML fallback page.
 */
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
