import { z } from "zod";
import { protectedProcedure } from "../../trpc";
import { customerFormSchema } from "~/types/customer-schema";
import { env } from "~/env";
import { TRPCError } from "@trpc/server";

const inputSchema = customerFormSchema.extend({ customerId: z.number() });

const outputSchema = z.object({
  data: z.object({
    id: z.number(),
    attributes: z.object({
      customerName: z.string(),
      attentionTo: z.string().nullable(),
      customerContact: z.string(),
      customerAddress: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string(),
    }),
  }),
  meta: z.object({}),
});

export const updateCustomerDetails = protectedProcedure
  .input(inputSchema)
  .output(outputSchema)
  .mutation(async ({ input, ctx }) => {
    const payload = {
      data: {
        customerName: input.customerName,
        attentionTo: input.attentionTo,
        customerContact: input.customerContact,
        customerAddress: input.customerAddress,
        sales_channel: {
          set: [parseInt(input.salesChannel.id)],
        },
      },
    };

    try {
      const response = await fetch(
        `${env.STRAPI_API_URL}/api/customers/${input.customerId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ctx.user.jwt}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) throw response;

      return await response.json();
    } catch (error) {
      console.error("Failed to update customer details", error);

      if (error instanceof TRPCError) throw error;

      // Generic error handler for unexpected errors
      if (!(error instanceof Response)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "An unknown error occurred while updating customer details via Strapi API. Please try again later.",
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
