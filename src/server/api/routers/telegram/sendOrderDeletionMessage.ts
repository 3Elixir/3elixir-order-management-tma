import { formatInTimeZone } from "date-fns-tz";
import { Telegram, TelegramError } from "telegraf";
import { z } from "zod";
import { env } from "~/env";
import { escapeSpecialChars } from "~/lib/utils";
import { publicProcedure } from "~/server/api/trpc";
import { outputSchema as deleteOrderResponseSchema } from "~/server/api/routers/order/deleteOrder";
import {
  calculateGstCost,
  calculateOrderGrandTotal,
  calculateTotalOrderAmount,
} from "~/lib/orderUtils";

const inputSchema = deleteOrderResponseSchema.extend({
  deletedOn: z.date(),
  chatId: z.number(),
});

export const sendOrderDeletionMessage = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const {
      chatId,
      deletedOn,
      data: {
        id: orderId,
        attributes: {
          customerName,
          attentionTo,
          customerContact,
          customerAddress,
          fulfilment_method: fulfilmentMethod,
          fulfilmentStart,
          fulfilmentEnd,
          order_status: orderStatus,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          sales_channel: salesChannel,
          sales_agents: salesAgents,
          orderProducts,
          deliveryFee,
          remarks,
          telegramMessage,
          excludeGst,
        },
      },
    } = input;
    const telegram = new Telegram(env.TELEGRAM_BOT_TOKEN);

    const fulfilmentDatetimeString = fulfilmentStart
      ? `${formatInTimeZone(fulfilmentStart, "Asia/Singapore", "dd/MM/yyyy - h:mm a")}${fulfilmentEnd ? `\nto ${formatInTimeZone(fulfilmentEnd, "Asia/Singapore", "dd/MM/yyyy h:mm a")}` : ""}`
      : "N/A";

    // Calculate gst amount
    const orderTotal = calculateTotalOrderAmount(
      orderProducts,
      deliveryFee ?? 0,
    );
    const gstCost = calculateGstCost(orderTotal);

    // Construct the order details message
    const orderDetailsMessage = `
*📦Order \\#${orderId} \\(deleted\\)\\!📦*
_Deleted on: ${escapeSpecialChars(
      formatInTimeZone(new Date(), "Asia/Singapore", "dd/MM/yyyy - h:mm:ss a"),
    )}_

🗑️🗑️🗑️🗑️🗑️🗑️🗑️🗑️🗑️

~__*1\\. Products included*__~
${orderProducts
  .map(
    (product) => `
~\\- Name: ${escapeSpecialChars(product.name)}~
~\\- Quantity: x${escapeSpecialChars(product.quantity.toString())}~
~\\- Price/Btl: $${escapeSpecialChars(product.price.toFixed(2))}~`,
  )
  .join("\n")
  .trim()}

~\\- Delivery fee: $${escapeSpecialChars((deliveryFee ?? 0).toFixed(2))}~
${excludeGst ? "~\\- GST excluded~" : `~\\- GST included \\($${gstCost}\\)~`}
~*Total price*: __$${escapeSpecialChars(
      calculateOrderGrandTotal(
        orderProducts,
        deliveryFee ?? 0,
        excludeGst,
      ).toFixed(2),
    )}__~

~__*2\\. Order details*__~
~\\- Customer name: ${escapeSpecialChars(customerName)}~${attentionTo ? `\n~\\- Attn: ${escapeSpecialChars(attentionTo.trim())}~` : ""}
~\\- Customer contact: ${escapeSpecialChars(customerContact)}~
~\\- Customer Address: ${escapeSpecialChars(customerAddress)}~
~\\- Payment method: ${escapeSpecialChars(paymentMethod.data.attributes.paymentMethod)}~
~\\- Payment status: ${escapeSpecialChars(paymentStatus.data.attributes.paymentStatus)}~
~\\- Fulfilment method: ${escapeSpecialChars(fulfilmentMethod.data.attributes.fulfilmentMethod)}~
~\\- Fulfilment datetime: ~
~${escapeSpecialChars(fulfilmentDatetimeString)}~
~\\- Sales channel: ${escapeSpecialChars(salesChannel.data.attributes.salesChannel)}~
~\\- Remarks: ${escapeSpecialChars(remarks)}~

~__*Payment details*__~
~${escapeSpecialChars("🧾Please Paynow/Paylah to our Company UEN 202135539W (3 Elixir PTE LTD) indicating your Invoice Number under the reference/comment section. Thank you!")}~
`;

    const bumpMessage = `
*🗑️Order \\#${orderId} deleted\\!🗑️*
`;

    // Try to update the main order details message in the channel to reflect the deletion
    let deleteMessageSuccess = false;
    try {
      if (!telegramMessage) {
        throw new Error("No telegram message found");
      }

      await telegram.editMessageText(
        env.TELEGRAM_CHANNEL_ID,
        telegramMessage.message_id,
        undefined,
        orderDetailsMessage,
        {
          parse_mode: "MarkdownV2",
        },
      );
      deleteMessageSuccess = true;
    } catch (error) {
      console.error("Error updating order details message", error);
    }

    // Send a message bumping the order to notify the channel that the order has been deleted
    try {
      await telegram.sendMessage(chatId, bumpMessage, {
        parse_mode: "MarkdownV2",
      });

      const reply_parameters = telegramMessage
        ? {
            message_id: telegramMessage.message_id,
          }
        : undefined;

      // Send message to the order channel
      await telegram.sendMessage(
        env.TELEGRAM_CHANNEL_ID,
        deleteMessageSuccess ? bumpMessage : orderDetailsMessage, // Send full order details if edit message failed
        {
          reply_parameters: deleteMessageSuccess ? reply_parameters : undefined, // Only reply if edit successful
          parse_mode: "MarkdownV2",
        },
      );

      return {
        success: true,
        message: "Confirmation message sent",
      };
    } catch (error) {
      console.error("Error sending confirmation message", error);
      if (error instanceof TelegramError) {
        return {
          success: false,
          message: error.description,
        };
      }
      return {
        success: false,
        message: "Error sending confirmation message",
      };
    }
  });
