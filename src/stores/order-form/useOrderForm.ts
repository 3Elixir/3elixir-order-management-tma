import { useContext } from "react";
import { StoresContext } from "@stores/stores-provider";
import { OrderFormStore } from "@stores/order-form/order-form-store";
import { useStore } from "zustand";

export const useOrderForm = <T>(selector: (store: OrderFormStore) => T): T => {
  const { orderFormStore } = useContext(StoresContext);

  if (!orderFormStore) {
    throw new Error(`useOrderForm must be use within StoresProvider`);
  }

  return useStore(orderFormStore, selector);
};
