import { z } from "zod";
import { publicProcedure } from "../../trpc";
import { env } from "~/env";
import { TRPCError } from "@trpc/server";
import qs from "qs";

const outputSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      attributes: z.object({
        brand: z.string(),
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

export const getBrands = publicProcedure
  .output(outputSchema)
  .query(async () => {
    const queryParams = {
      pagination: {
        page: 1,
        pageSize: 100,
      },
    };
    const queryParamsString = qs.stringify(queryParams, {
      encodeValuesOnly: true,
    });

    // Fetch products from Strapi API
    try {
      const response = await fetch(
        `${env.STRAPI_API_URL}/api/brands?${queryParamsString}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + env.STRAPI_API_TOKEN,
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
          " An error occurred while fetching product brands from the Strapi API. Please try again later.",
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          " An error occurred while fetching product brands from the Strapi API. Please try again later.",
      });
    }
  });
