/**
 * Router bootstrap — creates and returns a TanStack Router instance with
 * query client context, scroll restoration, and the auto-generated route tree.
 *
 * @module router
 */

import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * Creates and returns a configured TanStack Router instance.
 *
 * A new `QueryClient` is created on every call, which is safe for SSR
 * and avoids stale cache across requests.
 */
export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
