import { z } from "zod";

export const productFormSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Product Name is required"),
  brand: z.object({
    id: z.string().min(1, "Brand is required"),
    name: z.string(),
  }),
  category: z.object({
    id: z.string().min(1, "Category is required"),
    name: z.string(),
  }),
});
