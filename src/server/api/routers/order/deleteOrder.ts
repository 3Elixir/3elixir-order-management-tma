import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "~/env";
import { publicProcedure } from "~/server/api/trpc";
import { createCaller } from "../../root";
import { db } from "~/server/db";
import qs from "qs";

const inputSchema = z.object({
  orderId: z.number(),
  chatId: z.number(),
});

export const outputSchema = z.object({
  data: z.object({
    id: z.number(),
    attributes: z.object({
      customerName: z.string(),
      attentionTo: z.string().nullable(),
      customerContact: z.string(),
      customerAddress: z.string(),
      orderProducts: z.array(
        z.object({
          sku: z.string(),
          name: z.string(),
          brand: z.string(),
          price: z.number(),
          category: z.string(),
          quantity: z.number(),
          productId: z.number(),
        }),
      ),
      remarks: z.string(),
      orderCollectionDateTime: z.string(),
      orderId: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string(),
      fulfilmentStart: z.string().nullable(),
      fulfilmentEnd: z.string().nullable(),
      deliveryFee: z.number().nullable(),
      telegramMessage: z
        .object({ chat_id: z.number(), message_id: z.number() })
        .nullable(),
      sales_agents: z.object({
        data: z.array(
          z.object({
            id: z.number(),
            attributes: z.object({ name: z.string() }),
          }),
        ),
      }),
      payment_method: z.object({
        data: z.object({
          id: z.number(),
          attributes: z.object({ paymentMethod: z.string() }),
        }),
      }),
      payment_status: z.object({
        data: z.object({
          id: z.number(),
          attributes: z.object({ paymentStatus: z.string() }),
        }),
      }),
      sales_channel: z.object({
        data: z.object({
          id: z.number(),
          attributes: z.object({ salesChannel: z.string() }),
        }),
      }),
      order_status: z.object({
        data: z.object({
          id: z.number(),
          attributes: z.object({ orderStatus: z.string() }),
        }),
      }),
      fulfilment_method: z.object({
        data: z.object({
          id: z.number(),
          attributes: z.object({ fulfilmentMethod: z.string() }),
        }),
      }),
    }),
  }),
  meta: z.object({}),
});

export const deleteOrder = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const { orderId, chatId } = input;

    const queryParams = {
      populate: {
        sales_agents: {
          fields: ["name"],
        },
        payment_method: {
          fields: ["paymentMethod"],
        },
        payment_status: {
          fields: ["paymentStatus"],
        },
        sales_channel: {
          fields: ["salesChannel"],
        },
        order_status: {
          fields: ["orderStatus"],
        },
        fulfilment_method: {
          fields: ["fulfilmentMethod"],
        },
      },
    };
    const queryParamsString = qs.stringify(queryParams, {
      encodeValuesOnly: true,
    });

    try {
      const response = await fetch(
        `${env.STRAPI_API_URL}/api/orders/${orderId}?${queryParamsString}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${env.STRAPI_API_TOKEN}`,
          },
        },
      );
      const data = await response.json();
      if (response.status === 404)
        throw new TRPCError({ code: "NOT_FOUND", message: data.error.message });
      if (response.status === 401)
        throw new TRPCError({ code: "FORBIDDEN", message: data.error.message });
      if (response.status === 401)
        throw new TRPCError({ code: "FORBIDDEN", message: data.error.message });

      if (response.ok) {
        const parser = outputSchema.safeParse(data);
        if (!parser.success) throw new Error("Failed to delete order");
        return {
          success: true,
          message: "Order deleted successfully",
          data: parser.data,
        };
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          " An error occurred while deleting order through the Strapi API. Please try again later.",
      });
    } catch (error) {
      console.error("Failed to delete order", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          " An error occurred while deleting order through the Strapi API. Please try again later.",
      });
    }
  });
