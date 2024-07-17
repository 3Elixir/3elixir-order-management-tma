import { z } from "zod";
import { publicProcedure } from "../../trpc";
import { env } from "process";
import { TRPCError } from "@trpc/server";

const outputSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      attributes: z.object({
        agentID: z.string(),
        name: z.string(),
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

export const getSalesAgents = publicProcedure
  .output(outputSchema)
  .query(async () => {
    // Fetch products from Strapi API
    try {
      const response = await fetch(`${env.STRAPI_API_URL}/api/sales-agents`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + env.STRAPI_API_TOKEN,
        },
      });
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
          " An error occurred while fetching products from the Strapi API. Please try again later.",
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          " An error occurred while fetching sales agents from the Strapi API. Please try again later.",
      });
    }
  });
