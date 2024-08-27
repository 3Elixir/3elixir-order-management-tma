import { AuthGuard } from "~/lib/contexts/AuthProvider";
import { NextPageWithLayout } from "~/pages/_app";
import MainLayout from "~/components/layouts/MainLayout";
import { api } from "~/utils/api";
import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "~/server/api/root";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Phone,
  Search,
} from "lucide-react";
import { match } from "ts-pattern";
import { Input } from "~/components/ui/input";
import useDebounce from "~/lib/hooks/useDebounce";
import Link from "next/link";

type GetFilteredCustomersInput =
  inferRouterInputs<AppRouter>["customer"]["getFilteredCustomers"];

type GetFilteredCustomersOutput =
  inferRouterOutputs<AppRouter>["customer"]["getFilteredCustomers"];

const CustomersPage: NextPageWithLayout = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const {
    debouncedValue: debounchedSearch,
    liveValue: liveSearch,
    setLiveValue: setLiveSearch,
  } = useDebounce({
    initialValue: searchParams.get("search") ?? "",
    delay: 250,
    onDebouncedChange: () => {
      const params = new URLSearchParams(searchParams);
      if (
        params.get("search") !== liveSearch ||
        params.get("page") !== pagination.page.toString()
      ) {
        params.set("page", "1");
        params.set("search", liveSearch);
        router.replace({ search: params.toString() });
      }
    },
  });

  console.log(searchParams.toString());

  const pagination: GetFilteredCustomersInput["pagination"] = {
    page: parseInt(searchParams.get("page") ?? "1"),
    pageSize: parseInt(searchParams.get("pageSize") ?? "10"),
  };
  const sort: GetFilteredCustomersInput["sort"] = {
    field: searchParams.get("sortField") ?? "createdAt",
    direction: (searchParams.get("sortDirection") ?? "desc") as "asc" | "desc",
  };

  const customersQuery = api.customer.getFilteredCustomers.useQuery({
    filters: {
      search: debounchedSearch.trim(),
    },
    pagination,
    sort,
  });

  return (
    <div className="flex flex-grow flex-col">
      <div className="sticky top-0 z-50 flex gap-2 bg-white p-4 py-3 shadow">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by customer name"
            className="w-full rounded-lg bg-background pl-8"
            value={liveSearch}
            onChange={(e) => setLiveSearch(e.target.value)}
          />
        </div>
      </div>

      <section className="h-full overflow-y-auto bg-stone-100 px-3 pt-3">
        {match(customersQuery)
          .with(
            { status: "success" },
            ({ data: { data: filteredCustomers } }) =>
              filteredCustomers.length > 0 ? (
                <CustomersQueryList
                  customers={filteredCustomers}
                  isFetching={customersQuery.isFetching}
                />
              ) : (
                <CustomersQueryEmpty />
              ),
          )
          .with({ status: "pending" }, () => <CustomersQuerySkeleton />)
          .with({ status: "error" }, ({ error }) => (
            <CustomersQueryError errorMessage={error.message} />
          ))
          .exhaustive()}
      </section>

      <CustomersQueryFooter
        isPending={customersQuery.isPending}
        pagination={customersQuery.data?.meta.pagination}
      />
    </div>
  );
};

const CustomersQuerySkeleton = () => {
  return (
    <ul className="flex h-full flex-col items-center space-y-2">
      {Array.from({ length: 10 }).map((_, index) => (
        <li
          key={index}
          className="flex w-full flex-col gap-1 rounded border bg-white shadow-sm"
        >
          <div className="flex w-full justify-between px-3 py-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Separator />
          <div className="px-3 pb-2 pt-1">
            <Skeleton className="h-12 w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
};

const CustomersQueryError = ({ errorMessage }: { errorMessage: string }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <span className="text-5xl">💩</span>
      <p className="mt-2 text-center text-lg font-semibold text-red-500">
        Something went wrong
      </p>
      <span className="mt-2 text-center text-sm text-gray-500">
        {errorMessage}
      </span>
    </div>
  );
};

const CustomersQueryEmpty = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <span className="text-5xl">🤷‍♂️</span>
      <p className="mt-2 text-center text-lg font-semibold text-amber-600">
        Nothing found
      </p>
      <span className="mt-2 text-center text-sm text-gray-500">
        Try searching for something else or adjust your filters
      </span>
    </div>
  );
};

const CustomersQueryList = ({
  customers,
}: {
  customers: GetFilteredCustomersOutput["data"];
  isFetching: boolean;
}) => {
  return (
    <ul className="space-y-2 pb-4">
      {customers.map((customer) => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
      <div className="flex flex-col gap-1 p-2 pt-4 text-muted-foreground">
        <p className="text-center text-sm font-medium">End of page</p>
        <p className="text-center text-xs">
          View another page to see more orders
        </p>
      </div>
    </ul>
  );
};

const CustomerCard = ({
  customer,
}: {
  customer: GetFilteredCustomersOutput["data"][0];
}) => {
  const router = useRouter();
  return (
    <li className="flex flex-col rounded border bg-white shadow-sm">
      <div className="flex w-full justify-between px-3 py-2 text-sm">
        <span className="flex items-center font-medium text-gray-600">
          <Phone className="mr-1 h-3 w-3" />
          {customer.attributes.customerContact}
        </span>
        <Badge
          variant={
            customer.attributes.sales_channel.data?.attributes.salesChannel
              ? "default"
              : "secondary"
          }
        >
          {customer.attributes.sales_channel.data?.attributes.salesChannel ??
            "No sales channel"}
        </Badge>
      </div>
      <Separator />
      <div className="mt-1 flex w-full items-center px-3 pb-2 pt-1 text-sm">
        <div className="m mr-2 flex-grow">
          <p className="w-64 truncate text-base font-semibold">
            {customer.attributes.customerName}
          </p>
          <p className="flex items-center space-x-1 text-sm">
            <span>🏠</span>
            <span className="font-medium text-indigo-700">
              {customer.attributes.customerAddress || "No address"}
            </span>
          </p>
        </div>
        <Button
          className="min-h-9 min-w-9"
          size="icon"
          variant="outline"
          onClick={() => {
            router.push(`/customers/${customer.id}`);
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
};

const CustomersQueryFooter = ({
  pagination,
  isPending,
}: {
  pagination?: inferRouterOutputs<AppRouter>["order"]["getFilteredOrders"]["meta"]["pagination"];
  isPending: boolean;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentPage = pagination?.page ?? 0;
  const totalItems = pagination?.total ?? 0;
  const pageSize = pagination?.pageSize ?? 0;
  const currentPageStart = (currentPage - 1) * pageSize + 1;
  const currentPageEnd = Math.min(currentPage * pageSize, totalItems);

  const onPreviousPage = () => {
    const params = new URLSearchParams(searchParams);
    params.set("page", Math.max(1, currentPage - 1).toString());
    router.replace({ search: params.toString() });
  };

  const onNextPage = () => {
    const params = new URLSearchParams(searchParams);
    params.set(
      "page",
      Math.min(Math.ceil(totalItems / pageSize), currentPage + 1).toString(),
    );
    router.replace({ search: params.toString() });
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 flex items-center justify-between border-t bg-white p-3">
      <Button
        size="sm"
        variant="outline"
        onClick={() => onPreviousPage()}
        disabled={currentPage === 1 || isPending}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      {isPending ? (
        <p className="text-center text-sm text-muted-foreground">Loading...</p>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Showing <span className="font-semibold">{currentPageStart}</span>
          <span> - </span>
          <span className="font-semibold">{currentPageEnd}</span> of{" "}
          <span className="font-semibold">{totalItems}</span> orders
        </p>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onNextPage()}
        disabled={
          currentPage === Math.ceil(totalItems / pageSize) ||
          isPending ||
          totalItems === 0
        }
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

CustomersPage.getLayout = (page) => {
  return (
    <AuthGuard>
      <MainLayout title="👑 View Customers">{page}</MainLayout>
    </AuthGuard>
  );
};

export default CustomersPage;
