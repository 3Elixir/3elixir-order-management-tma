/**
 * This is the client-side entrypoint for your tRPC API. It is used to create the `api` object which
 * contains the Next.js App-wrapper, as well as your type-safe React Query hooks.
 *
 * We also create a few inference helpers for input and output types.
 */
import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import superjson from "superjson";
import { retrieveLaunchParams } from "@tma.js/sdk";

import { type AppRouter } from "~/server/api/root";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
};

/** A set of type-safe react-query hooks for your tRPC API. */
export const api = createTRPCNext<AppRouter>({
  config() {
    return {
      /**
       * Links used to determine request flow from client to server.
       *
       * @see https://trpc.io/docs/links
       */
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          /**
           * Transformer used for data de-serialization from the server.
           *
           * @see https://trpc.io/docs/data-transformers
           */
          transformer: superjson,
          url: `${getBaseUrl()}/api/trpc`,
          headers() {
            const headers: Record<string, string> = {};

            // Add Telegram initData for authentication
            if (typeof window !== "undefined") {
              try {
                const launchParams = retrieveLaunchParams();
                if (launchParams.initDataRaw) {
                  headers["x-telegram-init-data"] = launchParams.initDataRaw;
                }
              } catch (error) {
                console.error("Failed to retrieve launch params:", error);
              }

              // Add user JWT from localStorage if available
              const userStr = localStorage.getItem("user");
              if (userStr) {
                try {
                  const user = JSON.parse(userStr);
                  if (user?.jwt) {
                    headers["authorization"] = `Bearer ${user.jwt}`;
                  }
                } catch (error) {
                  console.error("Failed to parse user from localStorage:", error);
                }
              }
            }

            return headers;
          },
        }),
      ],
    };
  },
  /**
   * Whether tRPC should await queries when server rendering pages.
   *
   * @see https://trpc.io/docs/nextjs#ssr-boolean-default-false
   */
  ssr: false,
  transformer: superjson,
});

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
