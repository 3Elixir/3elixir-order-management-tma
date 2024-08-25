import { z } from "zod";
import { publicProcedure } from "../../trpc";
import qs from "qs";
import { env } from "process";
import { TRPCError } from "@trpc/server";

const inputSchema = z.object({
  customerId: z.string(),
});

const outputSchema = z.object({
  data: z.object({
    id: z.number(),
    attributes: z.object({
      customerName: z.string(),
      customerContact: z.string(),
      customerAddress: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string(),
      sales_channel: z.object({
        data: z
          .object({
            id: z.number(),
            attributes: z.object({ salesChannel: z.string() }),
          })
          .nullable(),
      }),
    }),
  }),
  meta: z.object({}),
});

export const getCustomerDetails = publicProcedure
  .input(inputSchema)
  .output(outputSchema)
  .query(async ({ input }) => {
    const queryParams = {
      populate: {
        sales_channel: {
          fields: ["salesChannel"],
        },
      },
    };
    const queryParamsString = qs.stringify(queryParams, {
      encodeValuesOnly: true,
    });

    try {
      // Make request to strapi backend for customers
      const response = await fetch(
        `${env.STRAPI_API_URL}/api/customers/${input.customerId}?${queryParamsString}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.STRAPI_API_TOKEN}`,
          },
        },
      );

      // Throw HTTP response if not ok
      if (!response.ok) throw response;

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch customer details", error);

      if (error instanceof TRPCError) throw error;

      // Generic error handler for unexpected errors
      if (!(error instanceof Response)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "An unknown error occurred while fetching customer details from the Strapi API. Please try again later.",
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
