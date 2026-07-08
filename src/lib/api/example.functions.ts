/**
 * Example TanStack React Start server functions.
 *
 * Server-side handlers invoked from the client via RPC. The `.handler` body
 * runs server-only — imports used only inside it (like `.server.ts` modules)
 * are tree-shaken from the client bundle.
 *
 * Use this pattern instead of Supabase Edge Functions for server logic.
 *
 * @module example.functions
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getServerConfig } from "../config.server";

// Example createServerFn. Server-side handler invoked from the client:
//   const result = await getGreeting({ data: { name: "Ada" } })
// The .handler body runs server-only — imports used only inside it (like
// .server.ts modules) are tree-shaken from the client bundle. Module-level
// code here still ships to the client; for truly server-only helpers, put
// them in a .server.ts file. Use this pattern instead of Supabase Edge
// Functions for server logic.

/**
 * Returns a personalised greeting together with the current server
 * environment mode. Validates `name` via Zod (min 1 character).
 *
 * @example
 *   const result = await getGreeting({ data: { name: "Ada" } })
 *   // → { greeting: "Hello, Ada!", mode: "development" }
 */
export const getGreeting = createServerFn({ method: "POST" })
  .inputValidator(z.object({ name: z.string().min(1) }))
  .handler(async ({ data }) => {
    const config = getServerConfig();
    return {
      greeting: `Hello, ${data.name}!`,
      mode: config.nodeEnv ?? "unknown",
    };
  });
