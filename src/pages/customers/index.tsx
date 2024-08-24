import { AuthGuard } from "~/lib/contexts/AuthProvider";
import { NextPageWithLayout } from "~/pages/_app";
import MainLayout from "~/components/layouts/MainLayout";
import { api } from "~/utils/api";
import { inferRouterInputs } from "@trpc/server";
import { AppRouter } from "~/server/api/root";
import { useRouter, useSearchParams } from "next/navigation";

type GetFilteredCustomersInputs =
  inferRouterInputs<AppRouter>["customer"]["getFilteredCustomers"];

const CustomersPage: NextPageWithLayout = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pagination: GetFilteredCustomersInputs["pagination"] = {
    page: parseInt(searchParams.get("page") ?? "1"),
    pageSize: parseInt(searchParams.get("pageSize") ?? "10"),
  };
  const sort: GetFilteredCustomersInputs["sort"] = {
    field: searchParams.get("sortField") ?? "createdAt",
    direction: (searchParams.get("sortDirection") ?? "desc") as "asc" | "desc",
  };

  const customersQuery = api.customer.getFilteredCustomers.useQuery({
    pagination,
    sort,
  });

  return (
    <div>
      <ul>{customersQuery.data?.data.map((customer) => <div></div>)}</ul>
    </div>
  );
};

CustomersPage.getLayout = (page) => {
  return (
    <AuthGuard>
      <MainLayout title="🗂️ View Customers">{page}</MainLayout>
    </AuthGuard>
  );
};

export default CustomersPage;
