import { TRPCError } from "@trpc/server";
import { validate, parse } from "@tma.js/init-data-node";
import { z } from "zod";
import { env } from "~/env";
import { publicProcedure } from "~/server/api/trpc";

const inputSchema = z.object({
  initDataRaw: z.string(),
});

const userDataSchema = z.object({
  jwt: z.string(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
    provider: z.string(),
    confirmed: z.boolean(),
    blocked: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    telegram_id: z.string().nullable(),
  }),
});

export const login = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const { initDataRaw } = input;

    // Step 1: Validate Telegram initData
    try {
      validate(initDataRaw, env.TELEGRAM_BOT_TOKEN);
      const validatedData = parse(initDataRaw);

      // Step 2: Extract telegram user ID
      const telegramUserId = validatedData.user?.id;
      if (!telegramUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Telegram user ID not found in initData",
        });
      }

      // Step 3: Authenticate with Strapi using the new telegram login endpoint
      const response = await fetch(`${env.STRAPI_API_URL}/api/auth/telegram/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initDataRaw,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Authentication rate limit exceeded",
          });
        }
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Failed to authenticate with Strapi",
        });
      }

      // Step 4: Parse and return user data with JWT
      const data = await response.json();
      const parsed = userDataSchema.safeParse(data);

      if (!parsed.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid response from Strapi",
        });
      }

      return {
        success: true,
        data: parsed.data,
        message: "User authenticated successfully",
      };
    } catch (error) {
      // Handle validation errors from @tma.js/init-data-node
      if (error instanceof Error && error.message.includes("invalid")) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid Telegram initData",
        });
      }

      // Re-throw TRPCErrors
      if (error instanceof TRPCError) {
        throw error;
      }

      // Handle unknown errors
      console.error("Login error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during authentication",
      });
    }
  });
