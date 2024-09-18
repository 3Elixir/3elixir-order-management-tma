import qs from "qs";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import { env } from "~/env";
import { TRPCError } from "@trpc/server";

const inputSchema = z.object({
  search: z.string(),
  filters: z
    .object({
      categories: z.array(z.string()).default([]),
      brands: z.array(z.string()).default([]),
    })
    .default({
      categories: [],
      brands: [],
    }),
  sort: z
    .array(z.object({ field: z.string(), order: z.enum(["asc", "desc"]) }))
    .default([{ field: "name", order: "asc" }]),
  pagination: z
    .object({
      page: z.number().default(1),
      pageSize: z.number().default(10),
    })
    .default({
      page: 1,
      pageSize: 10,
    }),
});

const outputSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      attributes: z.object({
        sku: z.string(),
        name: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        publishedAt: z.string(),
        defaultPrice: z.number().nullable(),
        category: z.object({
          data: z
            .object({
              id: z.number(),
              attributes: z.object({
                category: z.string(),
              }),
            })
            .nullable(),
        }),
        brand: z.object({
          data: z
            .object({
              id: z.number(),
              attributes: z.object({
                brand: z.string(),
              }),
            })
            .nullable(),
        }),
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

export const getFilteredProducts = publicProcedure
  .input(inputSchema)
  .output(outputSchema)
  .query(async ({ input }) => {
    const {
      search,
      filters: { categories, brands },
      sort,
      pagination,
    } = input;

    // Build query object and convert it to a query string for the Strapi API
    const query = {
      sort: sort.map(({ field, order }) => `${field}:${order}`),
      filters: {
        name: {
          $containsi: search,
        },
        category: {
          category: {
            $in: categories,
          },
        },
        brand: {
          brand: {
            $in: brands,
          },
        },
      },
      populate: {
        category: {
          fields: ["category"],
        },
        brand: {
          fields: ["brand"],
        },
      },
      pagination,
    };
    const queryString = qs.stringify(query, {
      encodeValuesOnly: true,
    });

    // Fetch products from Strapi API
    try {
      const response = await fetch(
        `${env.STRAPI_API_URL}/api/products?${queryString}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + env.STRAPI_API_TOKEN,
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
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          " An unknown error occurred while fetching products from the Strapi API. Please try again later.",
      });
    }
  });
