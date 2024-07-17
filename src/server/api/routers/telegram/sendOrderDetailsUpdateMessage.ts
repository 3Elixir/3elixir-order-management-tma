import { formatInTimeZone } from "date-fns-tz";
import { Telegram, TelegramError } from "telegraf";
import { z } from "zod";
import { env } from "~/env";
import { escapeSpecialChars } from "~/lib/utils";
import { publicProcedure } from "~/server/api/trpc";
import { outputSchema as updateOrderDetailsResponseSchema } from "~/server/api/routers/order/updateOrderDetails";

const inputSchema = updateOrderDetailsResponseSchema;

export const sendOrderDetailsUpdateMessage = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const {
      data: {
        id: orderId,
        attributes: {
          customerName,
          customerContact,
          customerAddress,
          fulfilment_method,
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
        },
      },
    } = input;

    // Initialize Telegram bot
    const telegram = new Telegram(env.TELEGRAM_BOT_TOKEN);

    const fulfilmentDatetimeString = fulfilmentStart
      ? `${formatInTimeZone(fulfilmentStart, "Asia/Singapore", "dd/MM/yyyy - h:mm a")}${fulfilmentEnd ? `\nto ${formatInTimeZone(fulfilmentEnd, "Asia/Singapore", "dd/MM/yyyy - h:mm a")}` : ""}`
      : "N/A";

    // Construct the order details message
    const orderDetailsMessage = `
*📦Order \\#${orderId} \\(updated\\)\\!📦*
_Last updated: ${escapeSpecialChars(
      formatInTimeZone(
        new Date(updatedAt),
        "Asia/Singapore",
        "dd/MM/yyyy - h:mm a",
      ),
    )}_

__*1\\. Customer Information*__
\\- Name: ${escapeSpecialChars(customerName)}
\\- Contact: ${escapeSpecialChars(customerContact)}
\\- Address: ${escapeSpecialChars(customerAddress)}
\\- Payment: ${escapeSpecialChars(paymentMethod.data.attributes.paymentMethod)}
\\- Payment status: ${escapeSpecialChars(paymentStatus.data.attributes.paymentStatus)}

__*2\\. Order details*__
\\- Status: ${escapeSpecialChars(orderStatus.data.attributes.orderStatus)}
\\- Sales channel: ${escapeSpecialChars(salesChannel.data.attributes.salesChannel)}
\\- Sales agents: ${salesAgents.data.length > 0 ? escapeSpecialChars(salesAgents.data.map((agent) => agent.attributes.name).join(", ")) : "N/A"}
\\- Fulfilment method: ${escapeSpecialChars(fulfilment_method.data.attributes.fulfilmentMethod)}
\\- Fulfilment datetime: 
${escapeSpecialChars(fulfilmentDatetimeString)}
\\- Delivery fee: $${escapeSpecialChars((deliveryFee ?? 0).toFixed(2).toString())}
\\- Remarks: ${escapeSpecialChars(remarks)}

__*3\\. Products included*__
${orderProducts
  .map(
    (product) => `
\\- Name: ${escapeSpecialChars(product.name)}
\\- SKU: ${escapeSpecialChars(product.sku)}
\\- Quantity: x${product.quantity}
\\- Price: $${product.price}`,
  )
  .join("\n")
  .trim()}
`;

    // Construct the bump message
    const bumpMessage = `
🚨📦*Order \\#${orderId} updated\\!*📦🚨

☝️View updated details☝️
`;

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
          reply_parameters: editMessageSuccess ? reply_parameters : undefined, // Only reply to original message if edit message succeeded
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
