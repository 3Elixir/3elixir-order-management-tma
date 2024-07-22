import { formatInTimeZone } from "date-fns-tz";
import { Telegram, TelegramError } from "telegraf";
import { z } from "zod";
import { env } from "~/env";
import { escapeSpecialChars } from "~/lib/utils";
import { publicProcedure } from "~/server/api/trpc";
import { orderFormSchema } from "~/types/order-schema";

const inputSchema = orderFormSchema.extend({
  chatId: z.number(),
  orderId: z.number(),
});

export const sendOrderDetailsMessage = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const {
      orderId,
      customerName,
      customerContact,
      customerAddress,
      paymentMethod,
      paymentStatus,
      fulfilmentMethod,
      orderStatus,
      fulfilmentDates: { hasEnd, fulfilmentEnd, fulfilmentStart },
      salesChannel,
      salesAgents,
      orderProducts,
      deliveryFee,
      remarks,
    } = input;

    const calculateOrderPrice = (
      products: typeof orderProducts,
      deliveryFee: number,
    ) => {
      const productCost = products.reduce(
        (accum, curr) => accum + curr.price * curr.quantity,
        0,
      );
      return productCost + deliveryFee;
    };

    const markdownMessage = `
*📦Order \\#${orderId} \\(created\\)\\!📦*

__*1\\. Customer Information*__
\\- Name: ${escapeSpecialChars(customerName)}
\\- Contact: ${escapeSpecialChars(customerContact)}
\\- Address: ${escapeSpecialChars(customerAddress)}
\\- Payment method: ${escapeSpecialChars(paymentMethod.name)}
\\- Payment status: ${escapeSpecialChars(paymentStatus.name)}

__*2\\. Order details*__
\\- Status: ${escapeSpecialChars(orderStatus.name)}
\\- Sales channel: ${escapeSpecialChars(salesChannel.name)}
\\- Sales agents: ${salesAgents.length > 0 ? escapeSpecialChars(salesAgents.map((agent) => agent.value.name).join(", ")) : "N/A"}
\\- Fulfilment method: ${escapeSpecialChars(fulfilmentMethod.name)}
\\- Fulfilment datetime: 
${escapeSpecialChars(
  formatInTimeZone(fulfilmentStart, "Asia/Singapore", "dd/MM/yyyy - h:mm a"),
)}${hasEnd ? `\nto ${formatInTimeZone(fulfilmentEnd, "Asia/Singapore", "dd/MM/yyyy - h:mm a")}` : ""}
\\- Delivery fee: $${escapeSpecialChars((deliveryFee ?? 0).toFixed(2))}
\\- Remarks: ${escapeSpecialChars(remarks)}

__*3\\. Products included*__
${orderProducts
  .map(
    (product) => `
\\- Name: ${escapeSpecialChars(product.name)}
\\- Quantity: x${product.quantity}
\\- Price/Btl: $${product.price}`,
  )
  .join("\n")
  .trim()}

*Total price*: __${escapeSpecialChars(
      calculateOrderPrice(orderProducts, deliveryFee).toFixed(2),
    )}__

__*Payment details*__
${escapeSpecialChars("🧾Please Paynow/Paylah to our Company UEN 202135539W (3 Elixir PTE LTD) indicating your Invoice Number under the reference/comment section. Thank you!")}
`;

    // Send a message to the order channel
    try {
      const telegram = new Telegram(env.TELEGRAM_BOT_TOKEN);
      const message = await telegram.sendMessage(
        env.TELEGRAM_CHANNEL_ID,
        markdownMessage,
        {
          parse_mode: "MarkdownV2",
        },
      );

      // Update order with the creation message ID
      await fetch(`${env.STRAPI_API_URL}/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            telegramMessage: {
              message_id: message.message_id,
              chat_id: parseInt(env.TELEGRAM_CHANNEL_ID),
            },
          },
        }),
      });

      return {
        success: true,
        message: "Message sent successfully",
        message_id: message.message_id,
      };
    } catch (error) {
      console.error("Failed to send message to Telegram channel", error);
      if (error instanceof TelegramError) {
        return {
          success: false,
          message: error.description,
        };
      }
      return {
        success: false,
        message: "Failed to send message to Telegram channel",
      };
    }
  });
