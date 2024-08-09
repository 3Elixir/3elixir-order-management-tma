import { createTRPCRouter } from "~/server/api/trpc";
import { sendOrderDetailsMessage } from "./sendOrderDetailsMessage";
import { sendOrderCreationMessage } from "./sendOrderCreationMessage";
import { sendOrderDeletionMessage } from "./sendOrderDeletionMessage";
import { sendOrderStatusUpdateMessage } from "./sendOrderStatusUpdateMessage";
import { sendOrderDetailsUpdateMessage } from "./sendOrderDetailsUpdateMessage";
import { sendProductCreationMessage } from "./sendProductCreationMessage";
import { sendOrderCancelledUpdateMessage } from "./sendOrderCancelledUpdateMessage";

export const telegramRouter = createTRPCRouter({
  sendOrderDetailsMessage,
  sendOrderCreationMessage,
  sendOrderDeletionMessage,
  sendOrderStatusUpdateMessage,
  sendOrderCancelledUpdateMessage,
  sendOrderDetailsUpdateMessage,
  sendProductCreationMessage,
});
