import type { NextPageWithLayout } from "~/pages/_app";
import { TmaSDKLoader } from "~/components/layouts/TmaSdkLoader";
import { Button } from "~/components/ui/button";
import MainLayout from "~/components/layouts/MainLayout";
import { api } from "~/utils/api";
import { useMemo, useRef, useState } from "react";
import { inferRouterOutputs, type inferRouterInputs } from "@trpc/server";
import { AppRouter } from "~/server/api/root";
import { match } from "ts-pattern";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { Label } from "~/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Dot,
  Hash,
  ListFilter,
  EllipsisVertical,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@components/ui/popover";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { useRouter } from "next/router";
import { useSearchParams } from "next/navigation";
import { AuthGuard } from "~/lib/contexts/AuthProvider";

type FilterOptionsType =
  inferRouterInputs<AppRouter>["order"]["getFilteredOrders"]["filters"];
type PaginationOptionsType =
  inferRouterInputs<AppRouter>["order"]["getFilteredOrders"]["pagination"];
type SortOptionsType =
  inferRouterInputs<AppRouter>["order"]["getFilteredOrders"]["sort"];

const OrdersPage: NextPageWithLayout = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Derive states for ordersQuery from URL params
  const pagination: PaginationOptionsType = {
    page: parseInt(searchParams.get("page") ?? "1"),
    pageSize: parseInt(searchParams.get("pageSize") ?? "10"),
  };
  const sort: SortOptionsType = {
    field: searchParams.get("sortField") ?? "createdAt",
    direction: (searchParams.get("sortDirection") ?? "desc") as "asc" | "desc",
  };
  const filters = {
    orderStatuses:
      searchParams.get("orderStatuses")?.split(",").map(Number) ?? [],
    paymentMethods:
      searchParams.get("paymentMethods")?.split(",").map(Number) ?? [],
    salesChannels:
      searchParams.get("salesChannels")?.split(",").map(Number) ?? [],
    salesAgents: searchParams.get("salesAgents")?.split(",").map(Number) ?? [],
  };

  const [appliedFilters, setAppliedFilters] =
    useState<FilterOptionsType>(filters);

  const ordersQuery = api.order.getFilteredOrders.useQuery({
    filters: appliedFilters,
    sort,
    pagination,
  });

  const onSortChange = (value: string) => {
    const [field, direction] = value.split(":") as [string, "asc" | "desc"];
    const params = new URLSearchParams(searchParams);
    params.set("sortField", field);
    params.set("sortDirection", direction);
    router.replace({ search: params.toString() });
  };

  return (
    <div className="flex flex-grow flex-col">
      <div className="sticky top-0 z-50 flex justify-between gap-2 bg-white p-4 py-3 shadow">
        <Select
          onValueChange={onSortChange}
          value={`${sort.field}:${sort.direction}`}
        >
          <SelectTrigger className="">
            <SelectValue
              placeholder={
                <span className="text-muted-foreground">
                  Sort by <EllipsisVertical className="h-4 w-4" />
                </span>
              }
              className="text-mute-foreground"
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt:desc">
              ⏰ Created at (newest)
            </SelectItem>
            <SelectItem value="createdAt:asc">
              ⏰ Created at (oldest)
            </SelectItem>
            <SelectItem value="fulfilmentStart:asc">
              📆 fulfilment start (earliest)
            </SelectItem>
            <SelectItem value="fulfilmentStart:desc">
              📆 fulfilment start (latest)
            </SelectItem>
          </SelectContent>
        </Select>
        <OrderQueryFilters
          filters={filters}
          appliedFilters={appliedFilters}
          setAppliedFilters={setAppliedFilters}
        />
      </div>

      <section className="h-full overflow-y-auto bg-stone-100 px-3 pt-3">
        <div ref={scrollRef} />
        {match(ordersQuery)
          .with({ status: "success" }, ({ data: { data: filteredOrders } }) =>
            filteredOrders.length > 0 ? (
              <OrdersQueryList
                orders={filteredOrders}
                ordersQueryFetching={ordersQuery.isFetching}
              />
            ) : (
              <OrderQueryEmpty />
            ),
          )
          .with({ status: "pending" }, () => <OrdersQuerySkeleton />)
          .with({ status: "error" }, ({ error }) => (
            <OrdersQueryError errorMessage={error.message} />
          ))
          .exhaustive()}
      </section>

      <OrdersQueryFooter
        isQueryLoading={ordersQuery.isLoading}
        pagination={ordersQuery.data?.meta.pagination}
      />
    </div>
  );
};

const OrdersQuerySkeleton = () => {
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

const OrdersQueryError = ({ errorMessage }: { errorMessage: string }) => {
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

const OrderQueryEmpty = () => {
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

const OrdersQueryList = ({
  orders,
  ordersQueryFetching,
}: {
  orders: inferRouterOutputs<AppRouter>["order"]["getFilteredOrders"]["data"];
  ordersQueryFetching: boolean;
}) => {
  return (
    <ul className="space-y-2 pb-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          ordersQueryFetching={ordersQueryFetching}
        />
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

const OrderCard = ({
  order,
  ordersQueryFetching,
}: {
  order: inferRouterOutputs<AppRouter>["order"]["getFilteredOrders"]["data"][0];
  ordersQueryFetching: boolean;
}) => {
  const {
    id: orderId,
    attributes: {
      customerName,
      order_status: orderStatus,
      fulfilment_method: fulfilmentMethod,
      fulfilmentStart,
      fulfilmentEnd,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      sales_channel: salesChannel,
      sales_agents: salesAgents,
    },
  } = order;

  const router = useRouter();
  const queryContext = api.useUtils();

  const [statusId, setStatusId] = useState(orderStatus.data?.id ?? 0);

  const orderStatusQuery = api.orderStatus.getOrderStatuses.useQuery();
  const sendStatusUpdateMutation =
    api.telegram.sendOrderStatusUpdateMessage.useMutation();
  const updateOrderStatusMutation = api.order.updateOrderStatus.useMutation({
    onSuccess: ({ data }) => {
      // Send a telegram update message to the channel
      sendStatusUpdateMutation.mutate({
        ...data,
        prevStatusName:
          orderStatus.data?.attributes.orderStatus ?? "no order status",
      });
    },
    onSettled: () => {
      // Refetch the orders list and order details after the status update
      queryContext.order.getFilteredOrders
        .refetch()
        .then(() => updateOrderStatusMutation.reset());
      queryContext.order.getOrderDetails.refetch({
        orderId: orderId.toString(),
      });
    },
  });

  const orderStatusLoading = useMemo(() => {
    if (updateOrderStatusMutation.isPending) {
      return true;
    }
    return (
      ordersQueryFetching &&
      orderId === updateOrderStatusMutation.variables?.orderId
    );
  }, [
    updateOrderStatusMutation.isPending,
    ordersQueryFetching,
    orderId,
    updateOrderStatusMutation.variables?.orderId,
  ]);

  return (
    <li className="flex flex-col rounded border bg-white shadow-sm">
      <div className="flex w-full justify-between gap-2 px-3 py-2 text-sm">
        <div className="flex flex-grow items-center font-medium text-gray-700">
          Order
          <Hash className="ml-1 h-3 w-3" />
          <span>{order.id}</span>
          <Dot className="h-4 min-h-4 w-4 min-w-4" />
          <Badge
            variant="outline"
            className="max-w-32 rounded-none font-light italic shadow-sm sm:max-w-40"
          >
            <p className="truncate">{customerName}</p>
          </Badge>
        </div>
        <Popover>
          <PopoverTrigger disabled={orderStatusLoading}>
            <Badge
              className={cn(orderStatusLoading && "animate-pulse")}
              variant={orderStatusLoading ? "secondary" : "default"}
            >
              {orderStatusLoading
                ? "Updating..."
                : orderStatus.data?.attributes.orderStatus ?? "no order status"}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="flex w-36 flex-col" side="bottom">
            <RadioGroup
              className="flex flex-col space-y-1"
              onValueChange={(value) => setStatusId(parseInt(value))}
              defaultValue={orderStatusQuery.data?.data
                .find((status) => status.id === orderStatus.data?.id)
                ?.id.toString()}
            >
              {orderStatusQuery.data?.data.map((status) => (
                <div key={status.id} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={status.id.toString()}
                    id={status.id.toString()}
                  />
                  <Label htmlFor={status.id.toString()}>
                    {status.attributes.orderStatus}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <PopoverClose asChild>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  updateOrderStatusMutation.mutate({
                    orderId,
                    statusId,
                    prevStatusName:
                      orderStatus.data?.attributes.orderStatus ??
                      "no order status",
                  });
                }}
                disabled={
                  updateOrderStatusMutation.isPending ||
                  (orderStatus.data?.id ?? 0) === statusId
                }
              >
                Update status
              </Button>
            </PopoverClose>
          </PopoverContent>
        </Popover>
      </div>
      <Separator />
      <div className="mt-1 flex w-full px-3 pb-2 pt-1 text-sm">
        <div className="flex flex-grow flex-col">
          <p className="flex items-center text-sm">
            <span className="font-medium">💼 Fulfil through</span>
            <Dot className="h-3.5 w-3.5" />
            <span className="font-light">
              {fulfilmentMethod.data?.attributes.fulfilmentMethod ??
                "no fulfilment method"}
            </span>
          </p>
          <p className="flex flex-wrap items-center text-sm">
            <span className="font-medium">📆 Fulfil by</span>
            <Dot className="h-3.5 w-3.5" />
            <div className="flex flex-col font-light">
              <span>
                {fulfilmentStart
                  ? format(new Date(fulfilmentStart), "dd/MM/yyyy - h:mm a")
                  : "No datetime set"}
              </span>
              {fulfilmentEnd && (
                <span>
                  <span>to </span>
                  <span>
                    {format(new Date(fulfilmentEnd), "dd/MM/yyyy - h:mm a")}
                  </span>
                </span>
              )}
            </div>
          </p>
          <p className="text-mute flex items-center text-sm">
            <span className="font-medium">💸 Paying with</span>
            <Dot className="h-3.5 w-3.5" />
            <span className="font-light capitalize">
              {paymentMethod.data?.attributes.paymentMethod ??
                "no payment method"}
            </span>
          </p>
          <p className="text-mute flex items-center text-sm">
            <span className="font-medium">ℹ️ Payment status</span>
            <Dot className="h-3.5 w-3.5" />
            <span className="font-light capitalize">
              {paymentStatus.data?.attributes.paymentStatus ??
                "no payment status"}
            </span>
          </p>
          <p className="flex items-center text-sm">
            <span className="font-medium">🛒 Sold through</span>
            <Dot className="h-3.5 w-3.5" />
            <span className="font-light capitalize">
              {salesChannel.data?.attributes.salesChannel ?? "no sales channel"}
            </span>
          </p>
          {salesAgents.data?.length > 0 && (
            <p className="flex items-center text-sm">
              <span className="font-medium">🤝 Sold by</span>
              <Dot className="h-3.5 w-3.5" />
              <span className="font-light capitalize">
                {salesAgents.data
                  ?.map((agent) => agent.attributes.name)
                  .join(", ")}
              </span>
            </p>
          )}
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => router.push(`/orders/${orderId}`)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
};

const OrderQueryFilters = ({
  filters,
  appliedFilters,
  setAppliedFilters,
}: {
  filters: FilterOptionsType;
  appliedFilters: FilterOptionsType;
  setAppliedFilters: React.Dispatch<React.SetStateAction<FilterOptionsType>>;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const orderStatusQuery = api.orderStatus.getOrderStatuses.useQuery();
  const paymentMethodsQuery = api.order.getPaymentMethods.useQuery();
  const salesChannelsQuery = api.salesChannel.getSalesChannels.useQuery();
  const salesAgentsQuery = api.salesAgent.getSalesAgents.useQuery();

  const hasFiltersApplied = Object.values(appliedFilters).some(
    (filter) => filter.length > 0,
  );

  const onSheetClose = async (open: boolean) => {
    // Reset the filters to applied filters when the sheet is closed
    if (!open) {
      const params = new URLSearchParams(searchParams);
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value.length > 0) {
          params.set(key, value.join(","));
        } else {
          params.delete(key);
        }
      });
      router.replace({ search: params.toString() }, undefined, {
        scroll: false,
      });
    }

    setSheetOpen(open);
  };

  const onClearFilters = async () => {
    // Reset the filters in the URL
    const params = new URLSearchParams(searchParams);
    Object.keys(filters).forEach((key) => params.delete(key));
    router.replace({ search: params.toString() });

    // Clear the filters state
    setAppliedFilters({
      orderStatuses: [],
      paymentMethods: [],
      salesChannels: [],
      salesAgents: [],
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    setSheetOpen(false);
  };

  const onApplyFilters = async () => {
    setAppliedFilters(filters);

    // Reset the page number to 1 when filters are applied
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    router.replace({ search: params.toString() });

    await new Promise((resolve) => setTimeout(resolve, 10));
    setSheetOpen(false);
  };

  return (
    <Sheet onOpenChange={onSheetClose} open={sheetOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn("relative w-10", hasFiltersApplied && "shadow-md")}
          onClick={() => setSheetOpen((prev) => !prev)}
        >
          <ListFilter className="h-4 w-4" />
          {hasFiltersApplied && (
            <div className="absolute right-0 top-0 -mr-2 -mt-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white shadow-md">
              {Object.values(appliedFilters).filter((f) => f.length > 0).length}
            </div>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-[325px] flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Order filters</SheetTitle>
          <SheetDescription>
            Filter orders by the following options
          </SheetDescription>
        </SheetHeader>
        {/* Order status options */}
        {match(orderStatusQuery)
          .with({ status: "success" }, ({ data: { data: orderStatuses } }) => (
            <div className="flex flex-grow flex-col gap-3">
              <div>
                <div className="flex h-6 items-center justify-between">
                  <Label>Order Statuses</Label>
                  {filters.orderStatuses.length > 0 && (
                    <Badge
                      variant="outline"
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.delete("orderStatuses");
                        router.push({ search: params.toString() });
                      }}
                    >
                      Clear
                    </Badge>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {orderStatuses.map((status) => (
                    <FilterToggleButton
                      key={status.id}
                      value={status.attributes.orderStatus}
                      selected={filters.orderStatuses.includes(status.id)}
                      onToggle={() => {
                        const params = new URLSearchParams(searchParams);
                        if (filters.orderStatuses.includes(status.id)) {
                          const newStatuses = filters.orderStatuses.filter(
                            (c) => c !== status.id,
                          );
                          params.set("orderStatuses", newStatuses.join(","));
                        } else {
                          const newStatuses = [
                            ...filters.orderStatuses,
                            status.id,
                          ];
                          params.set("orderStatuses", newStatuses.join(","));
                        }
                        router.replace(
                          { search: params.toString() },
                          undefined,
                          { scroll: false },
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))
          .with({ status: "pending" }, () => (
            <div> Loading filter options...</div>
          ))
          .with({ status: "error" }, ({ error }) => (
            <div> Error loading filter options: {error.message}</div>
          ))
          .exhaustive()}

        <Separator />

        {/* Payment method options */}
        {match(paymentMethodsQuery)
          .with({ status: "success" }, ({ data: { data: paymentMethods } }) => (
            <div className="flex flex-grow flex-col gap-3">
              <div>
                <div className="flex h-6 items-center justify-between">
                  <Label>Payment Methods</Label>
                  {filters.paymentMethods.length > 0 && (
                    <Badge
                      variant="outline"
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.delete("paymentMethods");
                        router.replace(
                          { search: params.toString() },
                          undefined,
                          { scroll: false },
                        );
                      }}
                    >
                      Clear
                    </Badge>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {paymentMethods.map((method) => (
                    <FilterToggleButton
                      key={method.id}
                      value={method.attributes.paymentMethod}
                      selected={filters.paymentMethods.includes(method.id)}
                      onToggle={() => {
                        const params = new URLSearchParams(searchParams);
                        if (filters.paymentMethods.includes(method.id)) {
                          const newMethods = filters.paymentMethods.filter(
                            (c) => c !== method.id,
                          );
                          params.set("paymentMethods", newMethods.join(","));
                        } else {
                          const newMethods = [
                            ...filters.paymentMethods,
                            method.id,
                          ];
                          params.set("paymentMethods", newMethods.join(","));
                        }
                        router.replace(
                          { search: params.toString() },
                          undefined,
                          { scroll: false },
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))
          .with({ status: "pending" }, () => (
            <div> Loading filter options...</div>
          ))
          .with({ status: "error" }, ({ error }) => (
            <div> Error loading filter options: {error.message}</div>
          ))
          .exhaustive()}

        <Separator />

        {/* Sales channel options */}
        {match(salesChannelsQuery)
          .with({ status: "success" }, ({ data: { data: salesChannels } }) => (
            <div className="flex flex-grow flex-col gap-3">
              <div>
                <div className="flex h-6 items-center justify-between">
                  <Label>Sales Channels</Label>
                  {filters.salesChannels.length > 0 && (
                    <Badge
                      variant="outline"
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.delete("salesChannels");
                        router.replace(
                          { search: params.toString() },
                          undefined,
                          { scroll: false },
                        );
                      }}
                    >
                      Clear
                    </Badge>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {salesChannels.map((channel) => (
                    <FilterToggleButton
                      key={channel.id}
                      value={channel.attributes.salesChannel}
                      selected={filters.salesChannels.includes(channel.id)}
                      onToggle={() => {
                        const params = new URLSearchParams(searchParams);
                        if (filters.salesChannels.includes(channel.id)) {
                          const newChannels = filters.salesChannels.filter(
                            (c) => c !== channel.id,
                          );
                          params.set("salesChannels", newChannels.join(","));
                        } else {
                          const newChannels = [
                            ...filters.salesChannels,
                            channel.id,
                          ];
                          params.set("salesChannels", newChannels.join(","));
                        }
                        router.replace(
                          { search: params.toString() },
                          undefined,
                          { scroll: false },
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))
          .with({ status: "pending" }, () => (
            <div> Loading filter options...</div>
          ))
          .with({ status: "error" }, ({ error }) => (
            <div> Error loading filter options: {error.message}</div>
          ))
          .exhaustive()}

        <Separator />

        {/* Sales agent options */}
        {match(salesAgentsQuery)
          .with({ status: "success" }, ({ data: { data: salesAgents } }) => (
            <div className="flex flex-grow flex-col gap-3">
              <div>
                <div className="flex h-6 items-center justify-between">
                  <Label>Sales Agents</Label>
                  {filters.salesAgents.length > 0 && (
                    <Badge
                      variant="outline"
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.delete("salesAgents");
                        router.replace(
                          { search: params.toString() },
                          undefined,
                          { scroll: false },
                        );
                      }}
                    >
                      Clear
                    </Badge>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {salesAgents.map((agent) => (
                    <FilterToggleButton
                      key={agent.id}
                      value={agent.attributes.name}
                      selected={filters.salesAgents.includes(agent.id)}
                      onToggle={() => {
                        const params = new URLSearchParams(searchParams);
                        if (filters.salesAgents.includes(agent.id)) {
                          const newAgents = filters.salesAgents.filter(
                            (c) => c !== agent.id,
                          );
                          params.set("salesAgents", newAgents.join(","));
                        } else {
                          const newAgents = [...filters.salesAgents, agent.id];
                          params.set("salesAgents", newAgents.join(","));
                        }
                        router.replace(
                          { search: params.toString() },
                          undefined,
                          { scroll: false },
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))
          .with({ status: "pending" }, () => (
            <div> Loading filter options...</div>
          ))
          .with({ status: "error" }, ({ error }) => (
            <div> Error loading filter options: {error.message}</div>
          ))
          .exhaustive()}

        <SheetFooter className="sticky bottom-0 mt-auto flex flex-row gap-2 rounded border bg-gray-200 bg-opacity-70 bg-clip-padding p-2 shadow-md backdrop-blur-md backdrop-filter">
          <Button
            className="flex-1"
            disabled={
              JSON.stringify(filters) === JSON.stringify(appliedFilters)
            }
            onClick={() => {
              onApplyFilters();
            }}
          >
            Apply filters
          </Button>
          {hasFiltersApplied && (
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => {
                onClearFilters();
              }}
            >
              Clear filters
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

const FilterToggleButton = ({
  value,
  selected,
  onToggle,
}: {
  value: string;
  selected: boolean;
  onToggle: () => void;
}) => {
  return (
    <Button
      size="sm"
      variant={selected ? "default" : "outline"}
      className={cn("rounded-none", selected && "ring-1 ring-offset-1")}
      onClick={() => onToggle()}
    >
      <span className="truncate capitalize">{value}</span>
    </Button>
  );
};

// Pagination for the orders list
const OrdersQueryFooter = ({
  pagination,
  isQueryLoading,
}: {
  pagination?: inferRouterOutputs<AppRouter>["order"]["getFilteredOrders"]["meta"]["pagination"];
  isQueryLoading: boolean;
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
        disabled={currentPage === 1 || isQueryLoading}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      {isQueryLoading ? (
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
          isQueryLoading ||
          totalItems === 0
        }
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

OrdersPage.getLayout = (page) => {
  return (
    <AuthGuard>
      <MainLayout title="🗂️ View Orders">{page}</MainLayout>
    </AuthGuard>
  );
};

export default OrdersPage;
