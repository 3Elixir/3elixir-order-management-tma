import { TRPCError } from "@trpc/server";
import qs from "qs";
import { output, z } from "zod";
import { env } from "~/env";
import { publicProcedure } from "~/server/api/trpc";

const outputSchema = z.object({
  categories: z.array(z.string()),
  brands: z.array(z.string()),
});

const categoriesSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      attributes: z.object({
        category: z.string(),
      }),
    }),
  ),
});

const brandsSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      attributes: z.object({
        brand: z.string(),
      }),
    }),
  ),
});

export const getFilterOptions = publicProcedure
  .output(outputSchema)
  .query(async () => {
    const categoriesSearchParams = {
      pagination: {
        page: 1,
        pageSize: 100,
      },
      fields: ["category"],
    };

    const results: z.infer<typeof outputSchema> = {
      categories: [],
      brands: [],
    };

    const categoriesSearchParamsString = qs.stringify(categoriesSearchParams);

    try {
      // Fetch categories from Strapi
      const categoriesResponse = await fetch(
        `${env.STRAPI_API_URL}/api/categories?${categoriesSearchParamsString}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + env.STRAPI_API_TOKEN,
          },
        },
      );
      if (!categoriesResponse.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch categories with ${categoriesResponse.status}`,
        });
      }

      // Parse categories response
      const categoriesParser = categoriesSchema.safeParse(
        await categoriesResponse.json(),
      );
      if (!categoriesParser.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Data validation failed for categories",
        });
      }

      // Map categories to results
      results.categories = categoriesParser.data.data.map(
        (category) => category.attributes.category,
      );
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch categories",
      });
    }

    const brandsSearchParams = {
      pagination: {
        page: 1,
        pageSize: 100,
      },
      fields: ["brand"],
    };
    const brandsSearchParamsString = qs.stringify(brandsSearchParams);

    try {
      // Fetch brands from Strapi
      const brandsResponse = await fetch(
        `${env.STRAPI_API_URL}/api/brands?${brandsSearchParamsString}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + env.STRAPI_API_TOKEN,
          },
        },
      );
      if (!brandsResponse.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch brands with ${brandsResponse.status}`,
        });
      }

      // Parse brands response
      const brandsParser = brandsSchema.safeParse(await brandsResponse.json());
      if (!brandsParser.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Data validation failed for brands",
        });
      }

      // Map brands to results
      results.brands = brandsParser.data.data.map(
        (brand) => brand.attributes.brand,
      );
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch brands",
      });
    }

    return results;
  });
