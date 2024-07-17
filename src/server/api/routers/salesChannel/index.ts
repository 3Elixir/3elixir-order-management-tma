import { createTRPCRouter } from "~/server/api/trpc";
import { getSalesChannels } from "./getSalesChannels";

export const salesChannelRouter = createTRPCRouter({
  getSalesChannels,
});
