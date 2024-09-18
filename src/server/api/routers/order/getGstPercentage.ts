import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

const outputSchema = z.object({
  data: z.object({
    id: z.number(),
    attributes: z.object({
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string(),
      percentage: z.number().nullable(),
    }),
  }),
  meta: z.object({}),
});

export const getGstPercentage = publicProcedure
  .output(outputSchema)
  .query(async () => {
    try {
      const response = await fetch(`${process.env.STRAPI_API_URL}/api/gst?`, {
        headers: {
          Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
      });
      if (!response.ok) throw response;
      return await response.json();
    } catch (error) {
      console.error("Failed to retrieve GST percentage", error);

      if (error instanceof TRPCError) throw error;

      // Generic error handler for unexpected errors
      if (!(error instanceof Response)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "An unknown error occurred while fetching GST percentage via Strapi API. Please try again later.",
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
