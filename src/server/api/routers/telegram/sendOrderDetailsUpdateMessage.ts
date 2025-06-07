import { formatInTimeZone } from "date-fns-tz";
import { Markup, Telegram, TelegramError } from "telegraf";
import { env } from "~/env";
import { escapeSpecialChars } from "~/lib/utils";
import { publicProcedure } from "~/server/api/trpc";
import { outputSchema as updateOrderDetailsResponseSchema } from "~/server/api/routers/order/updateOrderDetails";
import {
  calculateGstCost,
  calculateOrderGrandTotal,
  calculateTotalOrderAmount,
} from "~/lib/orderUtils";
import { z } from "zod";
import { outputSchema as getOrderDetailsResponseSchema } from "~/server/api/routers/order/getOrderDetails";
import {
  getOrderDifferenceMessage,
  getOrderDifferences,
} from "../../../../lib/orderDiff";
import { ReplyParameters } from "node_modules/telegraf/typings/core/types/typegram";

const inputSchema = updateOrderDetailsResponseSchema.extend({
  tmaUserName: z.string(),
  prevData: getOrderDetailsResponseSchema.shape.data,
});

export const sendOrderDetailsUpdateMessage = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const {
      tmaUserName,
      prevData,
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

    // Calculate gst amount
    const orderTotal = calculateTotalOrderAmount(
      orderProducts,
      deliveryFee ?? 0,
    );
    const gstCost = calculateGstCost(orderTotal);

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
_Updated by: [${escapeSpecialChars(tmaUserName)}](https://t.me/${escapeSpecialChars(tmaUserName.replace("@", ""))})_

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
\\- Sales agent(s): ${
      salesAgents.data.length > 0
        ? salesAgents.data
            .map((agent) => escapeSpecialChars(agent.attributes.name))
            .join(", ")
        : "N/A"
    }
\\- Remarks: ${remarks.trim() ? escapeSpecialChars(remarks) : "N/A"}

__*Payment details*__
${escapeSpecialChars("🧾Please Paynow/Paylah to our Company UEN 202135539W (3 Elixir PTE LTD) indicating your Invoice Number under the reference/comment section. Thank you!")}
`;

    const orderDifferences = getOrderDifferences(
      prevData.attributes,
      input.data.attributes,
      ["updatedAt", "telegramMessage", "customer"],
    );
    const orderDifferenceMessage = getOrderDifferenceMessage(orderDifferences);

    // Construct the bump message
    const bumpMessage = `
🚨📦*Order \\#${orderId} updated\\!*📦🚨
☝️View updated details☝️

_Updated by: [${escapeSpecialChars(tmaUserName)}](https://t.me/${escapeSpecialChars(tmaUserName.replace("@", ""))})_

${orderDifferenceMessage ? orderDifferenceMessage : ""}
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
      const reply_parameters: ReplyParameters | undefined = telegramMessage
        ? {
            message_id: telegramMessage.message_id,
          }
        : undefined;

      const miniAppUrl = new URL("https://t.me/threeelixirdevbot");
      miniAppUrl.searchParams.set("startapp", btoa(`/orders/${orderId}`));

      const { reply_markup } = Markup.inlineKeyboard([
        Markup.button.url("View Order in TMA", miniAppUrl.toString()),
      ]);

      const message = await telegram.sendMessage(
        env.TELEGRAM_CHANNEL_ID,
        editMessageSuccess ? bumpMessage : orderDetailsMessage, // Send full order details if edit message failed
        {
          reply_parameters: editMessageSuccess ? reply_parameters : undefined, // Only reply to original message if edit message succeeded
          parse_mode: "MarkdownV2",
          link_preview_options: {
            is_disabled: true, // Disable link previews for the message
          },
          reply_markup,
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
