import { z } from "zod";

export const customerFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerContact: z.string().min(1, "Customer contact is required"),
  customerAddress: z.string(),
  salesChannel: z.object({
    id: z.string().min(1, "Sales channel is required"),
    name: z.string(),
  }),
});
