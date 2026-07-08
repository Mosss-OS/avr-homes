/**
 * Application entry point — configures the TanStack Start instance with
 * global request-level middleware (SSR error handling).
 *
 * The error middleware catches unhandled server-side throws and renders a
 * fallback HTML error page instead of leaking raw error details.
 *
 * @module start
 */

import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/** The configured TanStack Start application instance. */
export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
