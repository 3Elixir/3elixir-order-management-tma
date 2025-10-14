import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "~/env";
import { protectedProcedure } from "~/server/api/trpc";
import { productFormSchema } from "~/types/product-schema";

const inputSchema = productFormSchema
  .pick({
    defaultPrice: true,
  })
  .extend({
    productId: z.number(),
  });

const outputSchema = z.object({
  data: z.object({
    id: z.number(),
    attributes: z.object({
      sku: z.string(),
      name: z.string(),
      defaultPrice: z.number().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string(),
    }),
  }),
  meta: z.object({}),
});

export const updateProductDefaultPrice = protectedProcedure
  .input(inputSchema)
  .output(outputSchema)
  .mutation(async ({ input, ctx }) => {
    const { productId, defaultPrice } = input;

    const payload = {
      data: {
        defaultPrice: defaultPrice ?? null,
      },
    };

    try {
      // Update order details in Strapi
      const response = await fetch(
        `${env.STRAPI_API_URL}/api/products/${productId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ctx.user.jwt}`,
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw response;

      const data = await response.json();
      return await data;
    } catch (error) {
      console.error("Failed to update product default pricing", error);

      if (error instanceof TRPCError) throw error;

      // Generic error handler for unexpected errors
      if (!(error instanceof Response)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "An unknown error occurred while updating product default pricing via Strapi API. Please try again later.",
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
