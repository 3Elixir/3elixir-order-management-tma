import { createTRPCRouter } from "~/server/api/trpc";
import { login } from "./login";

export const authRouter = createTRPCRouter({
  login,
});
