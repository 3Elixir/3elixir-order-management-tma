import { z } from "zod";
import { protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { env } from "~/env";

const outputSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      attributes: z.object({
        paymentMethod: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        publishedAt: z.string(),
      }),
    }),
  ),
  meta: z.object({
    pagination: z.object({
      page: z.number(),
      pageSize: z.number(),
      pageCount: z.number(),
      total: z.number(),
    }),
  }),
});

export const getPaymentMethods = protectedProcedure
  .output(outputSchema)
  .query(async ({ ctx }) => {
    // Fetch products from Strapi API
    try {
      const response = await fetch(
        `${env.STRAPI_API_URL}/api/payment-methods`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + ctx.user.jwt,
          },
        },
      );
      const data = await response.json();
      if (response.ok) return data;
      if (response.status === 404)
        throw new TRPCError({ code: "NOT_FOUND", message: data.error.message });
      if (response.status === 401)
        throw new TRPCError({ code: "FORBIDDEN", message: data.error.message });
      if (response.status === 401)
        throw new TRPCError({ code: "FORBIDDEN", message: data.error.message });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          " An error occurred while fetching payment methods from the Strapi API. Please try again later.",
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          " An error occurred while fetching payment methods from the Strapi API. Please try again later.",
      });
    }
  });
