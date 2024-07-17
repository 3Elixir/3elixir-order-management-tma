import { createTRPCRouter } from "~/server/api/trpc";
import { getSalesAgents } from "./getSalesAgents";

export const salesAgentRouter = createTRPCRouter({
  getSalesAgents,
});
