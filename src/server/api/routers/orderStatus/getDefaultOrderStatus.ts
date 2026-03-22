import { z } from "zod";
import { protectedProcedure } from "../../trpc";
import qs from "qs";
import { TRPCError } from "@trpc/server";

const outputSchema = z.object({
  data: z.object({
    id: z.number(),
    attributes: z.object({
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string(),
      order_status: z.object({
        data: z
          .object({
            id: z.number(),
            attributes: z.object({ orderStatus: z.string() }),
          })
          .nullable(),
      }),
    }),
  }),
  meta: z.object({}),
});

export const getDefaultOrderStatus = protectedProcedure
  .output(outputSchema)
  .query(async ({ ctx }) => {
    const queryParams = {
      populate: {
        order_status: {
          fields: ["orderStatus"],
        },
      },
    };
    const queryParamsString = qs.stringify(queryParams, {
      encodeValuesOnly: true,
    });

    try {
      const response = await fetch(
        `${process.env.STRAPI_API_URL}/api/utility?${queryParamsString}`,
        {
          headers: {
            Authorization: `Bearer ${ctx.user.jwt}`,
          },
        },
      );
      if (!response.ok) throw response;
      return await response.json();
    } catch (error) {
      console.error("Failed to retrieve default order status", error);

      if (error instanceof TRPCError) throw error;

      // Generic error handler for unexpected errors
      if (!(error instanceof Response)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "An unknown error occurred while fetching default order status via Strapi API. Please try again later.",
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
