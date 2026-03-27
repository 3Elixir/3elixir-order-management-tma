/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "~/server/db";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 */

import { parse, validate } from "@tma.js/init-data-node";
import { env } from "~/env";

type CreateContextOptions = {
  req?: CreateNextContextOptions["req"];
  res?: CreateNextContextOptions["res"];
};

/**
 * This helper generates the "internals" for a tRPC context. If you need to use it, you can export
 * it from here.
 *
 * Examples of things you may need it for:
 * - testing, so we don't have to mock Next.js' req/res
 * - tRPC's `createSSGHelpers`, where we don't have req/res
 *
 * @see https://create.t3.gg/en/usage/trpc#-serverapitrpcts
 */
const createInnerTRPCContext = (_opts: CreateContextOptions) => {
  return {
    db,
    req: _opts.req,
    res: _opts.res,
  };
};

/**
 * This is the actual context you will use in your router. It will be used to process every request
 * that goes through your tRPC endpoint.
 *
 * @see https://trpc.io/docs/context
 */
export const createTRPCContext = (_opts: CreateNextContextOptions) => {
  return createInnerTRPCContext({
    req: _opts.req,
    res: _opts.res,
  });
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure;

/**
 * Authentication middleware
 *
 * Validates Telegram initData and extracts user information.
 * Throws UNAUTHORIZED error if initData is missing or invalid.
 */
const enforceUserAuth = t.middleware(async ({ ctx, next }) => {
  // Get initDataRaw from request headers
  const initDataRaw = ctx.req?.headers["x-telegram-init-data"];

  if (!initDataRaw || typeof initDataRaw !== "string") {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Missing or invalid Telegram authentication data",
    });
  }

  try {
    // Validate Telegram initData
    validate(initDataRaw, env.TELEGRAM_BOT_TOKEN, { expiresIn: 0 });
    const validatedData = parse(initDataRaw);

    // Extract user JWT from authorization header (set by client after login)
    const authHeader = ctx.req?.headers.authorization;
    const jwt = authHeader?.replace("Bearer ", "");

    if (!jwt) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Missing authentication token. Please log in again.",
      });
    }

    // Pass validated data to context
    return next({
      ctx: {
        ...ctx,
        user: {
          jwt,
          telegramUser: validatedData.user,
        },
      },
    });
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    // Provide specific messages for common failure modes
    const msg =
      error instanceof Error ? error.message.toLowerCase() : "";
    if (msg.includes("expired")) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message:
          "Session expired. Please close and reopen the app from Telegram.",
      });
    }

    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid Telegram authentication data",
    });
  }
});

/**
 * Protected (authenticated) procedure
 *
 * Use this procedure for endpoints that require authentication.
 * The user's JWT and Telegram data will be available in ctx.user
 */
export const protectedProcedure = t.procedure.use(enforceUserAuth);
