import { formatInTimeZone } from "date-fns-tz";
import { Telegram, TelegramError } from "telegraf";
import { env } from "~/env";
import { escapeSpecialChars } from "~/lib/utils";
import { publicProcedure } from "~/server/api/trpc";
import { outputSchema as updateOrderDetailsResponseSchema } from "~/server/api/routers/order/updateOrderDetails";
import { calculateOrderGrandTotal } from "~/lib/orderUtils";

const inputSchema = updateOrderDetailsResponseSchema;

export const sendOrderDetailsUpdateMessage = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const {
      data: {
        id: orderId,
        attributes: {
          customerName,
          attentionTo,
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
          excludeGst,
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
        "dd/MM/yyyy - h:mm:ss a",
      ),
    )}_

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
${excludeGst ? "\\- GST excluded" : ""}
*Total price*: __$${escapeSpecialChars(
      calculateOrderGrandTotal(
        orderProducts,
        deliveryFee ?? 0,
        excludeGst,
      ).toFixed(2),
    )}__

__*2\\. Order details*__
\\- Customer name: ${escapeSpecialChars(customerName)}${attentionTo ? `\n\\- Attn: ${escapeSpecialChars(attentionTo.trim())}` : ""}
\\- Customer contact: ${escapeSpecialChars(customerContact)}
\\- Customer Address: ${escapeSpecialChars(customerAddress)}
\\- Payment method: ${escapeSpecialChars(paymentMethod.data.attributes.paymentMethod)}
\\- Payment status: ${escapeSpecialChars(paymentStatus.data.attributes.paymentStatus)}
\\- Fulfilment method: ${escapeSpecialChars(fulfilment_method.data.attributes.fulfilmentMethod)}
\\- Fulfilment datetime: 
${escapeSpecialChars(fulfilmentDatetimeString)}
\\- Sales channel: ${escapeSpecialChars(salesChannel.data.attributes.salesChannel)}
\\- Remarks: ${escapeSpecialChars(remarks)}

__*Payment details*__
${escapeSpecialChars("🧾Please Paynow/Paylah to our Company UEN 202135539W (3 Elixir PTE LTD) indicating your Invoice Number under the reference/comment section. Thank you!")}
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
