import { createStore } from "zustand/vanilla";
import { z } from "zod";
import { customerFormSchema } from "~/types/customer-schema";

export type CustomerFormState = z.infer<typeof customerFormSchema>;

export type OrderFormActions = {
  updateCustomerForm: (orderForm: Partial<CustomerFormState>) => void;
};

export type CustomerFormStore = CustomerFormState & OrderFormActions;

export const defaultInitState: CustomerFormState = {
  customerName: "",
  customerContact: "",
  customerAddress: "",
  salesChannel: {
    id: "",
    name: "",
  },
};

export const createCustomerFormStore = (
  initState: CustomerFormState = defaultInitState,
) => {
  return createStore<CustomerFormStore>((set) => ({
    ...initState,
    updateCustomerForm: (values) => set((state) => ({ ...state, ...values })),
  }));
};
