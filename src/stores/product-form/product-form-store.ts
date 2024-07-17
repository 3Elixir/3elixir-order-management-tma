import { createStore } from "zustand/vanilla";
import { productFormSchema } from "@schema/product-schema";
import { z } from "zod";

export type ProductFormState = z.infer<typeof productFormSchema>;

export type ProductFormActions = {
  updateProductForm: (orderForm: Partial<ProductFormState>) => void;
};

export type ProductFormStore = ProductFormState & ProductFormActions;

export const defaultInitState: ProductFormState = {
  sku: "",
  name: "",
  brand: {
    id: "",
    name: "",
  },
  category: {
    id: "",
    name: "",
  },
};

export const createProductFormStore = (
  initState: ProductFormState = defaultInitState,
) => {
  return createStore<ProductFormStore>((set) => ({
    ...initState,
    updateProductForm: (values) => set((state) => ({ ...state, ...values })),
  }));
};
