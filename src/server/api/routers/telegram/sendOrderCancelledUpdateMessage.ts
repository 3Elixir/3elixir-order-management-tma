import { Telegram, TelegramError } from "telegraf";
import { z } from "zod";
import { env } from "~/env";
import { escapeSpecialChars } from "~/lib/utils";
import { publicProcedure } from "~/server/api/trpc";
import { outputSchema } from "~/server/api/routers/order/updateOrderStatus";
import { formatInTimeZone } from "date-fns-tz";
import {
  calculateGstCost,
  calculateOrderGrandTotal,
  calculateTotalOrderAmount,
} from "~/lib/orderUtils";

const inputSchema = outputSchema.extend({
  tmaUserName: z.string(),
  prevStatusName: z.string(),
});

export const sendOrderCancelledUpdateMessage = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const {
      tmaUserName,
      prevStatusName,
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
          updatedAt,
          telegramMessage,
          excludeGst,
        },
      },
    } = input;

    // Instantiate the Telegram bot
    const telegram = new Telegram(env.TELEGRAM_BOT_TOKEN);

    const fulfilmentDatetimeString = fulfilmentStart
      ? `${formatInTimeZone(fulfilmentStart, "Asia/Singapore", "dd/MM/yyyy - h:mm a")}${fulfilmentEnd ? `\nto ${formatInTimeZone(fulfilmentEnd, "Asia/Singapore", "dd/MM/yyyy - h:mm a")}` : ""}`
      : "N/A";

    // Calculate gst amount
    const orderTotal = calculateTotalOrderAmount(
      orderProducts,
      deliveryFee ?? 0,
    );
    const gstCost = calculateGstCost(orderTotal);

    // Construct the order details message
    const orderDetailsMessage = `
*📦Order \\#${orderId} \\(updated\\)\\ \\- Cancelled\\!📦*
_Last updated: ${escapeSpecialChars(
      formatInTimeZone(
        new Date(updatedAt),
        "Asia/Singapore",
        "dd/MM/yyyy - h:mm:ss a",
      ),
    )}_
_Updated by: [${escapeSpecialChars(tmaUserName)}](https://t.me/${escapeSpecialChars(tmaUserName.replace("@", ""))})_
  
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
${excludeGst ? "~\\- GST excluded~" : `~\\- GST included \\($${escapeSpecialChars(gstCost.toFixed(2))}\\)~`}
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
~\\- Customer address: ${escapeSpecialChars(customerAddress)}~
~\\- Payment method: ${escapeSpecialChars(paymentMethod.data.attributes.paymentMethod)}~
~\\- Payment status: ${escapeSpecialChars(paymentStatus.data.attributes.paymentStatus)}~
~\\- Fulfilment method: ${escapeSpecialChars(fulfilmentMethod.data.attributes.fulfilmentMethod)}~
~\\- Fulfilment datetime: ~
~${escapeSpecialChars(fulfilmentDatetimeString)}~
~\\- Sales channel: ${escapeSpecialChars(salesChannel.data.attributes.salesChannel)}~
~\\- Sales agent\\(s\\): ${
      salesAgents.data.length > 0
        ? salesAgents.data
            .map((agent) => escapeSpecialChars(agent.attributes.name))
            .join(", ")
        : "N/A"
    }~
~\\- Remarks: ${escapeSpecialChars(remarks ?? "N/A")}~

~__*Payment details*__~
~${escapeSpecialChars("🧾Please Paynow/Paylah to our Company UEN 202135539W (3 Elixir PTE LTD) indicating your Invoice Number under the reference/comment section. Thank you!")}~
`;

    const bumpMessage = `*🚨Order \\#${orderId} has been cancelled*🚨`;

    // Try to update the main order details message in the channel
    let editMessageSuccess = false;

    try {
      if (!telegramMessage) {
        throw new Error("No telegram message found, cannot update message");
      }

      await telegram.editMessageText(
        env.TELEGRAM_CHANNEL_ID,
        telegramMessage.message_id,
        undefined,
        orderDetailsMessage,
        {
          parse_mode: "MarkdownV2",
          link_preview_options: {
            is_disabled: true, // Disable link previews for this message
          },
        },
      );
      editMessageSuccess = true;
    } catch (error) {
      console.error("Error updating order details message", error);
    }

    // Send a message bumping the order to notify the channel that the order has been updated
    try {
      const reply_parameters = telegramMessage
        ? {
            message_id: telegramMessage.message_id,
          }
        : undefined;
      const message = await telegram.sendMessage(
        env.TELEGRAM_CHANNEL_ID,
        editMessageSuccess ? bumpMessage : orderDetailsMessage, // Send full order details if edit message failed
        {
          reply_parameters: editMessageSuccess ? reply_parameters : undefined, // Only reply if edit successful
          parse_mode: "MarkdownV2",
        },
      );

      return {
        success: true,
        message: "Update message sent",
        message_id: message.message_id,
      };
    } catch (error) {
      console.error("Error sending update message", error);
      if (error instanceof TelegramError) {
        return {
          success: false,
          message: error.description,
        };
      }
      return {
        success: false,
        message: "Error sending update message",
      };
    }
  });
