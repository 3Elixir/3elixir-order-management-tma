import { z } from "zod";
import { publicProcedure } from "../../trpc";

const inputSchema = z.object({});

const outputSchema = z.object({});

export const createCustomer = publicProcedure
  .input(inputSchema)
  .output(outputSchema)
  .query(async ({ input }) => {});
