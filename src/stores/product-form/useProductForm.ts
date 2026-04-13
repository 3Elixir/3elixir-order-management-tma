import { useContext } from "react";
import { ProductFormStore } from "@stores/product-form/product-form-store";
import { StoresContext } from "@stores/stores-provider";
import { useStore } from "zustand";

export const useProductForm = <T>(
  selector: (store: ProductFormStore) => T,
): T => {
  const { productFormStore } = useContext(StoresContext);

  if (!productFormStore) {
    throw new Error(`useProductForm must be use within StoresProvider`);
  }

  return useStore(productFormStore, selector);
};
