import { z } from "zod";
import { env } from "~/env";
import { publicProcedure } from "~/server/api/trpc";
import {
  SALES_CHANNELS_WITH_SALES_AGENTS,
  orderFormSchema,
} from "~/types/order-schema";
import qs from "qs";
import { fromZonedTime } from "date-fns-tz";

const inputSchema = orderFormSchema.extend({
  orderId: z.number(),
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
      excludeGst: z.boolean(),
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
      customer: z.object({
        data: z
          .object({
            id: z.number(),
            attributes: z.object({}),
          })
          .nullable(),
      }),
    }),
  }),
  meta: z.object({}),
});

export const updateOrderDetails = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const {
      orderId,
      customerName,
      hasAttentionTo,
      attentionTo,
      customerAddress,
      customerContact,
      fulfilmentMethod,
      fulfilmentDates: { fulfilmentStart, fulfilmentEnd, hasEnd },
      orderStatus,
      paymentMethod,
      paymentStatus,
      salesChannel,
      salesAgents,
      orderProducts,
      deliveryFee,
      remarks,
      excludeGst,
    } = input;

    const cleanedAttentionTo = attentionTo.trim() ?? null;

    const payload = {
      data: {
        customerName,
        attentionTo: hasAttentionTo ? cleanedAttentionTo : null,
        customerAddress,
        customerContact,
        fulfilmentStart: fromZonedTime(fulfilmentStart, "Asia/Singapore"),
        fulfilmentEnd: hasEnd
          ? fromZonedTime(fulfilmentEnd, "Asia/Singapore")
          : null,
        deliveryFee,
        remarks,
        orderProducts,
        excludeGst,
        payment_method: {
          set: [parseInt(paymentMethod.id)],
        },
        payment_status: {
          set: [parseInt(paymentStatus.id)],
        },
        order_status: {
          set: [parseInt(orderStatus.id)],
        },
        sales_channel: {
          set: [parseInt(salesChannel.id)],
        },
        fulfilment_method: {
          set: [parseInt(fulfilmentMethod.id)],
        },
        sales_agents: {
          set: [] as number[],
        },
      },
    };

    // Only set sales agents if sales channel allows it
    const allowSalesAgents = SALES_CHANNELS_WITH_SALES_AGENTS.map((c) =>
      c.toLowerCase().trim(),
    ).includes(salesChannel.name.toLowerCase().trim());
    if (allowSalesAgents) {
      payload.data.sales_agents.set = salesAgents.map((salesAgent) =>
        parseInt(salesAgent.value.id),
      );
    }

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
        fulfilment_method: {
          fields: ["fulfilmentMethod"],
        },
        order_status: {
          fields: ["orderStatus"],
        },
        customer: {
          fields: ["id"],
        },
      },
    };
    const queryParamsString = qs.stringify(queryParams, {
      encodeValuesOnly: true,
    });

    try {
      // Update order details in Strapi
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
      if (!response.ok) {
        throw new Error("Failed to update order details");
      }

      // Parse response data
      const data = await response.json();
      const parser = outputSchema.safeParse(data);
      if (!parser.success) {
        throw new Error("Failed to update order details");
      }

      return {
        success: true,
        message: "Order details updated",
        data: parser.data,
      };
    } catch (error) {
      console.error("Failed to update order details", error);
      throw new Error("Failed to update order details");
    }
  });
