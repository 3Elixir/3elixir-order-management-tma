import { createTRPCRouter } from "~/server/api/trpc";
import { getFilteredCustomers } from "./getFilteredCustomers";
import { createCustomer } from "./createCustomer";
import { updateCustomerDetails } from "./updateCustomerDetails";
import { deleteCustomer } from "./deleteCustomer";
import { getCustomerDetails } from "./getCustomerDetails";

export const customerRouter = createTRPCRouter({
  createCustomer,
  getFilteredCustomers,
  getCustomerDetails,
  updateCustomerDetails,
  deleteCustomer,
});
