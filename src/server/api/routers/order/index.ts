import { createTRPCRouter } from "@server/api/trpc";
import { createOrder } from "./createOrder";
import { getFilteredOrders } from "./getFilteredOrders";
import { updateOrderStatus } from "./updateOrderStatus";
import { getOrderDetails } from "./getOrderDetails";
import { deleteOrder } from "./deleteOrder";
import { updateOrderDetails } from "./updateOrderDetails";
import { getPaymentMethods } from "./getPaymentMethods";
import { getPaymentStatuses } from "./getPaymentStatuses";
import { getFulfilmentMethods } from "./getFulfilmentMethods";

export const orderRouter = createTRPCRouter({
  getFilteredOrders,
  getOrderDetails,
  getPaymentMethods,
  getPaymentStatuses,
  getFulfilmentMethods,
  createOrder,
  deleteOrder,
  updateOrderStatus,
  updateOrderDetails,
});
