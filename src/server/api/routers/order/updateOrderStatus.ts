import { z } from "zod";
import { env } from "~/env";
import { publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { createCaller } from "../../root";
import qs from "qs";

const inputSchema = z.object({
  orderId: z.number(),
  statusId: z.number(),
  prevStatusName: z.string(),
});

export const outputSchema = z.object({
  data: z.object({
    id: z.number(),
    attributes: z.object({
      customerName: z.string(),
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

export const updateOrderStatus = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const { orderId, statusId, prevStatusName } = input;

    const payload = {
      data: {
        order_status: statusId,
      },
    };

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
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.STRAPI_API_TOKEN}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      const parser = outputSchema.safeParse(data);
      if (!parser.success) {
        throw new Error("Failed to update order status");
      }

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      return {
        success: true,
        data: parser.data,
        message: "Order status updated",
      };
    } catch (error) {
      console.error("Failed to update order status", error);
      throw new Error("Failed to update order status");
    }
  });
