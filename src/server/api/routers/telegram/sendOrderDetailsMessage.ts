import { formatInTimeZone } from "date-fns-tz";
import { Markup, Telegram, TelegramError } from "telegraf";
import { z } from "zod";
import { env } from "~/env";
import {
  calculateGstCost,
  calculateOrderGrandTotal,
  calculateTotalOrderAmount,
} from "~/lib/orderUtils";
import { escapeSpecialChars } from "~/lib/utils";
import { protectedProcedure } from "~/server/api/trpc";
import { orderFormSchema } from "~/types/order-schema";

const inputSchema = orderFormSchema.extend({
  chatId: z.number(),
  orderId: z.number(),
});

export const sendOrderDetailsMessage = protectedProcedure
  .input(inputSchema)
  .mutation(async ({ input, ctx }) => {
    const {
      orderId,
      customerName,
      attentionTo,
      customerContact,
      customerAddress,
      paymentMethod,
      paymentStatus,
      fulfilmentMethod,
      fulfilmentDates: { hasEnd, fulfilmentEnd, fulfilmentStart },
      salesChannel,
      orderProducts,
      deliveryFee,
      remarks,
      excludeGst,
      salesAgents,
    } = input;

    // Calculate gst amount
    const orderTotal = calculateTotalOrderAmount(
      orderProducts,
      deliveryFee ?? 0,
    );
    const gstCost = calculateGstCost(orderTotal);

    const markdownMessage = `
*📦Order \\#${orderId} \\(created\\)\\!📦*

__*1\\. Products included*__
${orderProducts
  .map(
    (product) => `
\\- Name: ${escapeSpecialChars(product.name)}
\\- Quantity: x${escapeSpecialChars(product.quantity.toString())}
\\- Price/Btl: $${escapeSpecialChars(product.price.toFixed(2))}`,
  )
  .join("\n")
  .trim()}

\\- Delivery fee: $${escapeSpecialChars((deliveryFee ?? 0).toFixed(2))}
${excludeGst ? "\\- GST excluded" : `\\- GST included \\($${escapeSpecialChars(gstCost.toFixed(2))}\\)`}
*Total price*: __$${escapeSpecialChars(
      calculateOrderGrandTotal(orderProducts, deliveryFee, excludeGst).toFixed(
        2,
      ),
    )}__

__*2\\. Order details*__
\\- Customer name: ${escapeSpecialChars(customerName)}${attentionTo ? `\n\\- Attn: ${escapeSpecialChars(attentionTo.trim())}` : ""}
\\- Customer contact: ${escapeSpecialChars(customerContact)}
\\- Customer address: ${escapeSpecialChars(customerAddress)}
\\- Payment method: ${escapeSpecialChars(paymentMethod.name)}
\\- Payment status: ${escapeSpecialChars(paymentStatus.name)}
\\- Fulfilment method: ${escapeSpecialChars(fulfilmentMethod.name)}
\\- Fulfilment datetime: 
${escapeSpecialChars(
  formatInTimeZone(fulfilmentStart, "Asia/Singapore", "dd/MM/yyyy - h:mm a"),
)}${hasEnd ? `\nto ${escapeSpecialChars(formatInTimeZone(fulfilmentEnd, "Asia/Singapore", "dd/MM/yyyy - h:mm a"))}` : ""}
\\- Sales channel: ${escapeSpecialChars(salesChannel.name)}
\\- Sales agent\\(s\\): ${
      salesAgents.length > 0
        ? salesAgents
            .map((agent) => escapeSpecialChars(agent.value.name))
            .join(", ")
        : "N/A"
    }
\\- Remarks: ${remarks.trim() ? escapeSpecialChars(remarks) : "N/A"}

__*Payment details*__
${escapeSpecialChars("🧾Please Paynow/Paylah to our Company UEN 202135539W (3 Elixir PTE LTD) indicating your Invoice Number under the reference/comment section. Thank you!")}
`;

    // Send a message to the order channel
    try {
      const telegram = new Telegram(env.TELEGRAM_BOT_TOKEN);

      const miniAppUrl = new URL(env.NEXT_PUBLIC_TELEGRAM_MINI_APP_URL);
      miniAppUrl.searchParams.set("startapp", btoa(`/orders/${orderId}`));

      const { reply_markup } = Markup.inlineKeyboard([
        Markup.button.url("📝 View Order", miniAppUrl.toString()),
      ]);

      const message = await telegram.sendMessage(
        env.TELEGRAM_CHANNEL_ID,
        markdownMessage,
        {
          parse_mode: "MarkdownV2",
          link_preview_options: {
            is_disabled: true, // Disable link previews for the message
          },
          reply_markup,
        },
      );

      // Update order with the creation message ID
      await fetch(`${env.STRAPI_API_URL}/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.user.jwt}`,
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
