import { TRPCError } from "@trpc/server";
import qs from "qs";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";

const inputSchema = z.object({
  productId: z.string(),
});

const outputSchema = z.object({
  data: z.object({
    id: z.number(),
    attributes: z.object({
      sku: z.string(),
      name: z.string(),
      defaultPrice: z.number().nullable(),
      brand: z.object({
        data: z
          .object({
            id: z.number(),
            attributes: z.object({ brand: z.string() }),
          })
          .nullable(),
      }),
      category: z.object({
        data: z
          .object({
            id: z.number(),
            attributes: z.object({ category: z.string() }),
          })
          .nullable(),
      }),
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string(),
    }),
  }),
  meta: z.object({}),
});

export const getProductDetails = publicProcedure
  .input(inputSchema)
  .output(outputSchema)
  .query(async ({ input }) => {
    const { productId } = input;

    // Fetch the product details from Strapi API
    const queryParams = {
      populate: {
        brand: {
          fields: ["brand"],
        },
        category: {
          fields: ["category"],
        },
      },
    };
    const queryParamsString = qs.stringify(queryParams, {
      encodeValuesOnly: true,
    });

    try {
      const response = await fetch(
        `${process.env.STRAPI_API_URL}/api/products/${productId}?${queryParamsString}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
          },
        },
      );
      const data = await response.json();
      if (response.ok) return data;

      if (response.status === 401) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "Provided credentials are invalid. Please provide the correct credentials.",
        });
      }
      if (response.status === 404) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Requested endpoint not found. Please check the request",
        });
      }
      if (response.status === 403) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Credentials are required to access the requested endpoint. Please provide the correct credentials.",
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: data.error.message,
      });
    } catch (error) {
      console.error("Failed to fetch product details", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "An unknown error occurred while fetching product details from the Strapi API. Please try again later.",
      });
    }
  });
