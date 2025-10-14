import { z, ZodError } from "zod";
import { protectedProcedure } from "../../trpc";
import qs from "qs";
import { env } from "~/env";
import { TRPCError } from "@trpc/server";

const inputSchema = z.object({
  customerId: z.number(),
  productId: z.number(),
});

const outputSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      attributes: z.object({
        price: z.number().nullable(),
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

export const getPricing = protectedProcedure
  .input(inputSchema)
  .query(async ({ input, ctx }) => {
    const queryParams = {
      filters: {
        customer: {
          id: {
            $eq: input.customerId,
          },
        },
        product: {
          id: {
            $eq: input.productId,
          },
        },
      },
    };
    const queryParamsString = qs.stringify(queryParams, {
      encodeValuesOnly: true,
    });

    try {
      // Make request to strapi backend for customers
      const response = await fetch(
        `${env.STRAPI_API_URL}/api/customer-products?${queryParamsString}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ctx.user.jwt}`,
          },
        },
      );

      // Throw HTTP response if not ok
      if (!response.ok) throw response;

      const parsedData = outputSchema.parse(await response.json());
      return parsedData.data[0] ?? null;
    } catch (error) {
      console.error("Failed to fetch customer product entry", error);

      if (error instanceof TRPCError) throw error;

      if (error instanceof ZodError)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });

      // Generic error handler for unexpected errors
      if (!(error instanceof Response)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "An unknown error occurred while fetching customer product entry from the Strapi API. Please try again later.",
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
