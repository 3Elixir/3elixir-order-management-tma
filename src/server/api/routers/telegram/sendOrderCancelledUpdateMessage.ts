import { Telegram, TelegramError } from "telegraf";
import { z } from "zod";
import { env } from "~/env";
import { escapeSpecialChars } from "~/lib/utils";
import { publicProcedure } from "~/server/api/trpc";
import { outputSchema } from "~/server/api/routers/order/updateOrderStatus";
import { formatInTimeZone } from "date-fns-tz";

const inputSchema = outputSchema.extend({
  prevStatusName: z.string(),
});

export const sendOrderCancelledUpdateMessage = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const {
      prevStatusName,
      data: {
        id: orderId,
        attributes: {
          customerName,
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
        },
      },
    } = input;

    // Instantiate the Telegram bot
    const telegram = new Telegram(env.TELEGRAM_BOT_TOKEN);

    const fulfilmentDatetimeString = fulfilmentStart
      ? `${formatInTimeZone(fulfilmentStart, "Asia/Singapore", "dd/MM/yyyy - h:mm a")}${fulfilmentEnd ? `\nto ${formatInTimeZone(fulfilmentEnd, "Asia/Singapore", "dd/MM/yyyy - h:mm a")}` : ""}`
      : "N/A";

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

    // Construct the order details message
    const orderDetailsMessage = `
*📦Order \\#${orderId} \\(updated\\)\\ - Cancelled!📦*
_Last updated: ${escapeSpecialChars(
      formatInTimeZone(
        new Date(updatedAt),
        "Asia/Singapore",
        "dd/MM/yyyy - h:mm:ss a",
      ),
    )}_

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

~*Total price*: __$${escapeSpecialChars(
      calculateOrderPrice(orderProducts, deliveryFee ?? 0).toFixed(2),
    )}__~

~__*2\\. Order details*__~
~\\- Customer name: ${escapeSpecialChars(customerName)}~
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
*🚨Order \\#${orderId} has been updated*🚨

Status: _${escapeSpecialChars(prevStatusName)}_ → _${escapeSpecialChars(orderStatus.data.attributes.orderStatus)}_
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
