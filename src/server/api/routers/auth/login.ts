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
      validate(initDataRaw, env.TELEGRAM_BOT_TOKEN, { expiresIn: 604800 });
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
      // Retry up to 2 times on transient network failures
      let response: Response | undefined;
      let lastError: Error | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await fetch(`${env.STRAPI_API_URL}/api/auth/telegram/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              initDataRaw,
            }),
          });
          break; // Success, exit retry loop
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn(
            `Strapi auth attempt ${attempt + 1}/3 failed:`,
            lastError.message,
          );
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      }

      if (!response) {
        console.error("All Strapi auth attempts failed:", lastError?.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to reach authentication service. Please try again.",
        });
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.error(
          `Strapi auth failed with status ${response.status}:`,
          errorBody,
        );
        if (response.status === 429) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Authentication rate limit exceeded. Please wait a moment.",
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
      // Re-throw TRPCErrors as-is (already formatted)
      if (error instanceof TRPCError) {
        throw error;
      }

      // Handle validation/expiration errors from @tma.js/init-data-node
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        // Catch both "invalid" and "expired" initData errors
        if (msg.includes("expired")) {
          console.warn("Telegram initData expired:", error.message);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Session expired. Please close and reopen the app from Telegram.",
          });
        }
        if (
          msg.includes("invalid") ||
          msg.includes("signature") ||
          msg.includes("hash")
        ) {
          console.warn("Telegram initData validation failed:", error.message);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid Telegram authentication data",
          });
        }
      }

      // Handle unknown errors with full logging
      console.error("Login error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during authentication. Please try again.",
      });
    }
  });
