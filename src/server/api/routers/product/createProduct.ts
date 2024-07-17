import { publicProcedure } from "@server/api/trpc";
import { z } from "zod";
import { env } from "~/env";
import { productFormSchema } from "~/types/product-schema";

const inputSchema = productFormSchema;

const outputSchema = z.object({
  data: z.object({
    id: z.number(),
    attributes: z.object({
      sku: z.string(),
      name: z.string(),
      publishedAt: z.string(),
    }),
  }),
  meta: z.object({}),
});

export const createProduct = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const { sku, name, brand, category } = input;

    const payload = {
      data: {
        sku,
        name,
        brand: {
          connect: [parseInt(brand.id)],
        },
        category: {
          connect: [parseInt(category.id)],
        },
      },
    };

    // Create order via Strapi API
    try {
      const response = await fetch(`${env.STRAPI_API_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok)
        throw new Error(`Failed to create order: ${response.status}`);

      // Validate the response data
      const data = await response.json();
      const parser = outputSchema.safeParse(data);
      if (!parser.success) {
        throw new Error("Response failed data validation");
      }

      return {
        success: true,
        message: "Product created successfully",
        data: parser.data,
      };
    } catch (error) {
      console.error("Failed to create product", error);
      return {
        success: false,
        message: "Failed to create product",
      };
    }
  });
