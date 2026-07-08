/**
 * Integration with the Lovable preview environment's error reporting bridge.
 *
 * Injects errors into `window.__lovableEvents.captureException` so they
 * surface in the Lovable devtools / preview overlay.
 *
 * @module lovable-error-reporting
 */

/** Options passed alongside a reported error. */
type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
  }
}

/**
 * Reports an error to the Lovable preview environment, if available.
 *
 * Adds the current route and `source: "react_error_boundary"` to the
 * context automatically. Safe to call on the server (no-op).
 *
 * @param error - The error to report.
 * @param context - Additional context to include with the report.
 */
export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}
