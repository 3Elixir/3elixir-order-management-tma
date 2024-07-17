import { createTRPCRouter } from "~/server/api/trpc";
import { getFilteredProducts } from "./getFilteredProducts";
import { getFilterOptions } from "./getFilterOptions";
import { getBrands } from "./getBrands";
import { getCategories } from "./getCategories";
import { createProduct } from "./createProduct";
import { deleteProduct } from "./deleteProduct";
import { getProductDetails } from "./getProductDetails";
import { updateProductDetails } from "./updateProductDetails";

export const productRouter = createTRPCRouter({
  getFilteredProducts,
  getFilterOptions,
  getBrands,
  getCategories,
  getProductDetails,
  createProduct,
  deleteProduct,
  updateProductDetails,
});
