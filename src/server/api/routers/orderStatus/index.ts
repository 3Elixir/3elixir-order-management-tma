import { createTRPCRouter } from "~/server/api/trpc";
import { getOrderStatuses } from "./getOrderStatuses";
import { getDefaultOrderStatus } from "./getDefaultOrderStatus";

export const orderStatusRouter = createTRPCRouter({
  getOrderStatuses,
  getDefaultOrderStatus,
});
