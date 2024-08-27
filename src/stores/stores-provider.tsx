import { type ReactNode, createContext, useRef } from "react";
import { type StoreApi } from "zustand";

import {
  type OrderFormStore,
  createOrderFormStore,
} from "@stores/order-form/order-form-store";

import {
  type ProductFormStore,
  createProductFormStore,
} from "@stores/product-form/product-form-store";

import {
  type CustomerFormStore,
  createCustomerFormStore,
} from "@stores/customer-form/customer-form-store";

export const StoresContext = createContext<{
  orderFormStore: StoreApi<OrderFormStore> | null;
  productFormStore: StoreApi<ProductFormStore> | null;
  customerFormStore: StoreApi<CustomerFormStore> | null;
}>({ orderFormStore: null, productFormStore: null, customerFormStore: null });

export interface StoresProviderProps {
  children: ReactNode;
}

export const StoresProvider = ({ children }: StoresProviderProps) => {
  const orderFormStoreRef = useRef<StoreApi<OrderFormStore>>();
  if (!orderFormStoreRef.current) {
    orderFormStoreRef.current = createOrderFormStore();
  }

  const productFormStoreRef = useRef<StoreApi<ProductFormStore>>();
  if (!productFormStoreRef.current) {
    productFormStoreRef.current = createProductFormStore();
  }

  const customerFormStoreRef = useRef<StoreApi<CustomerFormStore>>();
  if (!customerFormStoreRef.current) {
    customerFormStoreRef.current = createCustomerFormStore();
  }

  return (
    <StoresContext.Provider
      value={{
        orderFormStore: orderFormStoreRef.current,
        productFormStore: productFormStoreRef.current,
        customerFormStore: customerFormStoreRef.current,
      }}
    >
      {children}
    </StoresContext.Provider>
  );
};
