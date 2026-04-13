import { z } from "zod";

export const productFormSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Product name is required"),
  defaultPrice: z.number().min(0, "Price cannot be negative").optional(),
  brand: z.object({
    id: z.string(),
    name: z.string(),
  }),
  category: z.object({
    id: z.string().min(1, "Category is required"),
    name: z.string(),
  }),
});
