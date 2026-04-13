import { z } from "zod";
import { env } from "~/env";
import { protectedProcedure } from "~/server/api/trpc";
import { productFormSchema } from "~/types/product-schema";

const inputSchema = productFormSchema.extend({
  productId: z.number(),
});

export const updateProductDetails = protectedProcedure
  .input(inputSchema)
  .mutation(async ({ input, ctx }) => {
    const { productId, name, sku, brand, category, defaultPrice } = input;

    const payload = {
      data: {
        name,
        sku,
        defaultPrice,
        brand: {
          set: isNaN(parseInt(brand.id)) ? [] : [parseInt(brand.id)],
        },
        category: {
          set: [parseInt(category.id)],
        },
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
      if (!response.ok) {
        throw new Error("Failed to update order details");
      }

      return {
        success: true,
        message: "Product details updated",
      };
    } catch (error) {
      console.error("Failed to update product details", error);
      throw new Error("Failed to update product details");
    }
  });
