import { useContext } from "react";
import { StoresContext } from "@stores/stores-provider";
import { useStore } from "zustand";
import { CustomerFormStore } from "./customer-form-store";

export const useCustomerForm = <T>(
  selector: (store: CustomerFormStore) => T,
): T => {
  const { customerFormStore } = useContext(StoresContext);

  if (!customerFormStore) {
    throw new Error(`useCustomerForm must be use within StoresProvider`);
  }

  return useStore(customerFormStore, selector);
};
