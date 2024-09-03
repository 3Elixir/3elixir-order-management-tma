import { createStore } from "zustand/vanilla";
import { orderFormSchema } from "@schema/order-schema";
import { z } from "zod";

export type OrderFormState = z.infer<typeof orderFormSchema>;

export type OrderFormActions = {
  updateOrderForm: (orderForm: Partial<OrderFormState>) => void;
};

export type OrderFormStore = OrderFormState & OrderFormActions;

export const defaultInitState: OrderFormState = {
  hasAttentionTo: false,
  attentionTo: "",
  customerId: null,
  customerName: "",
  customerContact: "",
  customerAddress: "",
  fulfilmentMethod: {
    id: "",
    name: "",
  },
  orderCollectionDateTime: (() => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    return date;
  })(),
  fulfilmentDates: {
    hasEnd: false,
    fulfilmentStart: (() => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      return date;
    })(),
    fulfilmentEnd: (() => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      return date;
    })(),
  },
  orderStatus: {
    // Set to id of default orderStatus: "Pending"
    id: "6",
    name: "Pending",
  },
  paymentMethod: {
    id: "",
    name: "",
  },
  paymentStatus: {
    id: "",
    name: "",
  },
  salesAgents: [],
  salesChannel: {
    id: "",
    name: "",
  },
  orderProducts: [],
  remarks: "",
  deliveryFee: 0,
};

export const createOrderFormStore = (
  initState: OrderFormState = defaultInitState,
) => {
  return createStore<OrderFormStore>((set) => ({
    ...initState,
    updateOrderForm: (values) => set((state) => ({ ...state, ...values })),
  }));
};
