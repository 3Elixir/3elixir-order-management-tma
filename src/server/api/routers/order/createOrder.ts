import {
  SALES_CHANNELS_WITH_SALES_AGENTS,
  orderFormSchema,
} from "@schema/order-schema";
import { protectedProcedure } from "@server/api/trpc";
import { z } from "zod";
import { env } from "~/env";
import { createCaller } from "../../root";
import { db } from "~/server/db";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<{ success: boolean; message?: string }>,
  context: string,
): Promise<{ success: boolean; message?: string; attempts: number }> {
  let lastError: { success: boolean; message?: string } = {
    success: false,
    message: "Unknown error",
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await fn();
    lastError = result;

    if (result.success) {
      return { success: true, attempts: attempt };
    }

    if (attempt < MAX_RETRIES) {
      console.warn(
        `${context} failed (attempt ${attempt}/${MAX_RETRIES}): ${result.message}. Retrying...`,
      );
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  console.error(
    `${context} failed after ${MAX_RETRIES} attempts: ${lastError.message}`,
  );
  return { success: false, message: lastError.message, attempts: MAX_RETRIES };
}

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

const returnSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

type CreateOrderResponse = z.infer<typeof returnSchema>;

export const createOrder = protectedProcedure
  .input(inputSchema)
  .mutation(async ({ input, ctx }): Promise<CreateOrderResponse> => {
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
      excludeGst,
      customerId,
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
        excludeGst,
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

        // Connect customer if provided
        ...(customerId && {
          customer: {
            connect: [customerId],
          },
        }),
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
          Authorization: `Bearer ${ctx.user.jwt}`,
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

      // Send messages to Telegram with retry
      const {
        data: { id: orderId },
      } = parser.data;
      const caller = createCaller({
        req: ctx.req,
        res: ctx.res,
        db,
      });

      const [confirmationResult, detailsResult] = await Promise.all([
        withRetry(
          () =>
            caller.telegram.sendOrderCreationMessage({
              chatId,
              orderId,
            }),
          "Order confirmation message",
        ),
        withRetry(
          () =>
            caller.telegram.sendOrderDetailsMessage({
              orderId,
              ...input,
            }),
          "Order details message",
        ),
      ]);

      // Check if all Telegram notifications succeeded
      if (!confirmationResult.success || !detailsResult.success) {
        const failedMessages = [
          !confirmationResult.success && "confirmation",
          !detailsResult.success && "details",
        ]
          .filter(Boolean)
          .join(" and ");
        return {
          success: false,
          message: `Order #${orderId} created successfully, but ${failedMessages} notification${failedMessages.includes(" and ") ? "s" : ""} failed to send after ${MAX_RETRIES} retries`,
        };
      }

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
