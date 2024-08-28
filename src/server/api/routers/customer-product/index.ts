import { createTRPCRouter } from "~/server/api/trpc";
import { updatePricing } from "./updatePricing";
import { getPricing } from "./getPricing";
import { createPricing } from "./createPricing";

export const customerProductRouter = createTRPCRouter({
  updatePricing,
  getPricing,
  createPricing,
});
