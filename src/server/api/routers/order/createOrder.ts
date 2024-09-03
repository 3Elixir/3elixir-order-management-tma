import {
  SALES_CHANNELS_WITH_SALES_AGENTS,
  orderFormSchema,
} from "@schema/order-schema";
import { publicProcedure } from "@server/api/trpc";
import { z } from "zod";
import { env } from "~/env";
import { createCaller } from "../../root";
import { db } from "~/server/db";

const inputSchema = orderFormSchema.extend({
  chatId: z.number(),
});

const outputSchema = z.object({
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
      excludeGst: z.boolean(),
    }),
  }),
  meta: z.object({}),
});

export const createOrder = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const {
      chatId,
      customerName,
      hasAttentionTo,
      attentionTo,
      customerAddress,
      customerContact,
      orderCollectionDateTime,
      fulfilmentDates: { fulfilmentStart, fulfilmentEnd, hasEnd },
      orderStatus,
      paymentMethod,
      paymentStatus,
      fulfilmentMethod,
      salesChannel,
      salesAgents,
      orderProducts,
      deliveryFee,
      remarks,
    } = input;

    // Clean conditional field - attentionTo
    const cleanedAttentionTo = attentionTo.trim() ?? null;

    const payload = {
      data: {
        customerName,
        attentionTo: hasAttentionTo ? cleanedAttentionTo : null,
        customerContact,
        customerAddress,
        orderCollectionDateTime,
        remarks,
        orderProducts,
        deliveryFee,
        fulfilmentStart,
        fulfilmentEnd: hasEnd ? fulfilmentEnd : null,
        order_status: {
          connect: [parseInt(orderStatus.id)],
        },
        fulfilment_method: {
          connect: [parseInt(fulfilmentMethod.id)],
        },
        sales_channel: {
          connect: [parseInt(salesChannel.id)],
        },
        sales_agents: {
          connect: [] as number[],
        },
        payment_method: {
          connect: [parseInt(paymentMethod.id)],
        },
        payment_status: {
          connect: [parseInt(paymentStatus.id)],
        },
      },
    };

    // Only set sales agents if sales channel allows it
    const allowSalesAgents = SALES_CHANNELS_WITH_SALES_AGENTS.map((c) =>
      c.toLowerCase().trim(),
    ).includes(salesChannel.name.toLowerCase().trim());
    if (allowSalesAgents) {
      payload.data.sales_agents.connect = salesAgents.map((salesAgent) =>
        parseInt(salesAgent.value.id),
      );
    }

    // Create order via Strapi API
    try {
      const response = await fetch(`${env.STRAPI_API_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok)
        throw new Error(`Failed to create order: ${response.status}`);

      // Validate the response data
      const data = await response.json();
      const parser = outputSchema.safeParse(data);
      if (!parser.success) {
        throw new Error("Response failed data validation");
      }

      // Send messages to Telegram
      const {
        data: { id: orderId },
      } = parser.data;
      const caller = createCaller({
        db,
      });
      await Promise.all([
        // Send confirmation message to customer
        caller.telegram.sendOrderCreationMessage({
          chatId,
          orderId,
        }),
        // Send order details to order channel
        caller.telegram.sendOrderDetailsMessage({
          orderId,
          ...input,
        }),
      ]);

      return {
        success: true,
        message: "Order created successfully",
      };
    } catch (error) {
      console.error("Failed to create order", error);
      return {
        success: false,
        message: "Failed to create order",
      };
    }
  });
