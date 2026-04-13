import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "~/env";
import { protectedProcedure } from "~/server/api/trpc";

const inputSchema = z.object({
  productId: z.number(),
});

export const outputSchema = z.object({
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

export const deleteProduct = protectedProcedure
  .input(inputSchema)
  .mutation(async ({ input, ctx }) => {
    const { productId } = input;

    try {
      const response = await fetch(
        `${env.STRAPI_API_URL}/api/products/${productId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${ctx.user.jwt}`,
          },
        },
      );
      const data = await response.json();
      if (response.status === 404)
        throw new TRPCError({ code: "NOT_FOUND", message: data.error.message });
      if (response.status === 401)
        throw new TRPCError({ code: "FORBIDDEN", message: data.error.message });
      if (response.status === 401)
        throw new TRPCError({ code: "FORBIDDEN", message: data.error.message });

      if (response.ok) {
        const parser = outputSchema.safeParse(data);
        if (!parser.success) throw new Error("Failed to delete product");
        return {
          success: true,
          message: "Order deleted successfully",
          data: parser.data,
        };
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          " An error occurred while deleting product through the Strapi API. Please try again later.",
      });
    } catch (error) {
      console.error("Failed to delete product", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          " An error occurred while deleting product through the Strapi API. Please try again later.",
      });
    }
  });
