import { exampleRouter } from "~/server/api/routers/example";
import { orderRouter } from "~/server/api/routers/order";
import { productRouter } from "~/server/api/routers/product";
import { salesAgentRouter } from "~/server/api/routers/salesAgent";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { salesChannelRouter } from "./routers/salesChannel";
import { orderStatusRouter } from "./routers/orderStatus";
import { telegramRouter } from "./routers/telegram";
import { customerRouter } from "./routers/customer";
import { customerProductRouter } from "./routers/customer-product";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  order: orderRouter,
  product: productRouter,
  salesAgent: salesAgentRouter,
  salesChannel: salesChannelRouter,
  orderStatus: orderStatusRouter,
  telegram: telegramRouter,
  customer: customerRouter,
  customerProduct: customerProductRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
