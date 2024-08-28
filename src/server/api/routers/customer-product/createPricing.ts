import { z } from "zod";
import { publicProcedure } from "../../trpc";
import { env } from "~/env";
import { TRPCError } from "@trpc/server";

const inputSchema = z.object({
  customerId: z.number(),
  productId: z.number(),
  price: z.number().nullable(),
});

const outputSchema = z.object({
  data: z.object({
    id: z.number(),
    attributes: z.object({
      price: z.number().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string(),
    }),
  }),
  meta: z.object({}),
});

export const createPricing = publicProcedure
  .input(inputSchema)
  .output(outputSchema)
  .mutation(async ({ input }) => {
    const payload = {
      data: {
        price: input.price,
        customer: {
          connect: [input.customerId],
        },
        product: {
          connect: [input.productId],
        },
      },
    };

    try {
      const response = await fetch(
        `${env.STRAPI_API_URL}/api/customer-products`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.STRAPI_API_TOKEN}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) throw response;

      const data = await response.json();
      return await data;
    } catch (error) {
      console.error("Failed to create customer product pricing", error);

      if (error instanceof TRPCError) throw error;

      // Generic error handler for unexpected errors
      if (!(error instanceof Response)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "An unknown error occurred while creating customer product pricing via Strapi API. Please try again later.",
        });
      }

      // Specific http error handler
      if (error.status === 401) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "Provided credentials are invalid. Please provide the correct credentials.",
        });
      }
      if (error.status === 404) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Requested endpoint not found. Please check the request",
        });
      }
      if (error.status === 403) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Credentials are required to access the requested endpoint. Please provide the correct credentials.",
        });
      }
      if (error.status === 429) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Too many request made within a short time, please try again later.",
        });
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: (await error.json()).message,
      });
    }
  });
