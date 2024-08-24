import { z } from "zod";
import { publicProcedure } from "../../trpc";
import qs from "qs";
import { env } from "process";
import { TRPCError } from "@trpc/server";
import { generateMock } from "@anatine/zod-mock";

const inputSchema = z.object({
  sort: z.object({
    field: z.string(),
    direction: z.enum(["asc", "desc"]),
  }),
  filters: z.object({}).optional(),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
  }),
});

const outputSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      attributes: z.object({
        customerName: z.string(),
        customerContact: z.string(),
        customerAddress: z.string(),
        salesChannel: z.object({
          data: z
            .object({
              id: z.number(),
              attributes: z.object({ salesChannel: z.string() }),
            })
            .nullable(),
        }),
      }),
    }),
  ),
});

export const getFilteredCustomers = publicProcedure
  .input(inputSchema)
  .output(outputSchema)
  .query(async ({ input }) => {
    const { pagination, sort } = input;

    const queryParams = {
      sort: `${sort.field}:${sort.direction}`,
      populate: {
        salesChannel: {
          fields: ["salesChannel"],
        },
      },
      pagination,
    };
    const queryParamsString = qs.stringify(queryParams, {
      encodeValuesOnly: true,
    });

    try {
      // // Make request to strapi backend for customers
      // const response = await fetch(
      //   `${env.STRAPI_API_URL}/api/orders?${queryParamsString}`,
      //   {
      //     headers: {
      //       "Content-Type": "application/json",
      //       Authorization: `Bearer ${env.STRAPI_API_TOKEN}`,
      //     },
      //   },
      // );
      // const data = await response.json();

      // // Handle errors
      // if (!response.ok) {
      //   if (response.status === 401) {
      //     throw new TRPCError({
      //       code: "UNAUTHORIZED",
      //       message:
      //         "Provided credentials are invalid. Please provide the correct credentials.",
      //     });
      //   }
      //   if (response.status === 404) {
      //     throw new TRPCError({
      //       code: "NOT_FOUND",
      //       message: "Requested endpoint not found. Please check the request",
      //     });
      //   }
      //   if (response.status === 403) {
      //     throw new TRPCError({
      //       code: "FORBIDDEN",
      //       message:
      //         "Credentials are required to access the requested endpoint. Please provide the correct credentials.",
      //     });
      //   }
      //   throw new TRPCError({
      //     code: "INTERNAL_SERVER_ERROR",
      //     message: data.error.message,
      //   });
      // }

      // TODO: MOCK DATA
      const data = generateMock(outputSchema);
      return data;
    } catch (error) {
      // Log error
      console.error("Failed to fetch customers", error);

      if (error instanceof TRPCError) throw error;

      // Generic error handler for unexpected errors
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "An unknown error occurred while fetching orders from the Strapi API. Please try again later.",
      });
    }
  });
