/**
 * Captures unhandled errors / rejections out-of-band so that `server.ts` can
 * recover the original Error + stack trace when h3 swallows a throw into a
 * generic JSON 500 Response.
 *
 * Listeners are registered on `error` and `unhandledrejection` events.
 * Captured errors expire after 5 seconds.
 *
 * @module error-capture
 */

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

/**
 * Consumes and returns the most recently captured error, or `undefined` if
 * none is available or the TTL has expired.
 *
 * Calling this clears the captured error (one-shot).
 */
export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
