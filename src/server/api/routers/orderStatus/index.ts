import { createTRPCRouter } from "~/server/api/trpc";
import { getOrderStatuses } from "./getOrderStatuses";

export const orderStatusRouter = createTRPCRouter({
  getOrderStatuses,
});
