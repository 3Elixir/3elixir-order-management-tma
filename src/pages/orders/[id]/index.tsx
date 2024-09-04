import MainLayout from "~/components/layouts/MainLayout";
import { NextPageWithLayout } from "~/pages/_app";
import { useParams } from "next/navigation";
import { useBackButton, usePopup, useInitData } from "@tma.js/sdk-react";
import { on as onTmaEvent, off as offTmaEvent } from "@tma.js/sdk";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { api } from "~/utils/api";
import { match } from "ts-pattern";
import { Skeleton } from "~/components/ui/skeleton";
import { inferRouterOutputs } from "@trpc/server";
import { appRouter, AppRouter } from "~/server/api/root";
import { format } from "date-fns";
import { Dot } from "lucide-react";
import { Textarea } from "~/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Label } from "~/components/ui/label";
import { PopupClosedPayload } from "node_modules/@tma.js/sdk/dist/dts/bridge/events/parsers/popupClosed";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { useOrderForm } from "@stores/order-form/useOrderForm";
import { AuthGuard } from "~/lib/contexts/AuthProvider";
import {
  calculateGstCost,
  calculateOrderGrandTotal,
  calculateTotalOrderAmount,
  DEFAULT_GST_PERCENTAGE,
} from "~/lib/orderUtils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { createServerSideHelpers } from "@trpc/react-query/server";
import { db } from "~/server/db";
import superjson from "superjson";

export const getServerSideProps = (async (ctx) => {
  // Retrieve url params i.e /orders/[id]
  const { id } = ctx.params as { id: string };

  // Create trpc helper to make server side calls
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: {
      db,
    },
    transformer: superjson,
  });

  // Prefetch order details based on id to ensure data is ready upon render
  await helpers.order.getOrderDetails.prefetch({
    orderId: id,
  });

  return {
    props: {
      trpcState: helpers.dehydrate(),
      id,
    },
  };
}) satisfies GetServerSideProps<{ id: string }>;

const ViewOrderPage: NextPageWithLayout<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ id: orderId }) => {
  const tmaBackButton = useBackButton();
  const router = useRouter();

  const orderDetailsQuery = api.order.getOrderDetails.useQuery({
    orderId,
  });

  // Show the back button to navigate back to the previous page
  useEffect(() => {
    tmaBackButton.show();
    const onBackButtonPress = () => router.back();
    tmaBackButton.on("click", onBackButtonPress);

    return () => {
      tmaBackButton.off("click", onBackButtonPress);
      tmaBackButton.hide();
    };
  }, []);

  return (
    <div className="flex flex-grow flex-col">
      <section className="h-full flex-1 overflow-y-auto bg-stone-100">
        {match(orderDetailsQuery)
          .with(
            {
              status: "success",
            },
            ({ data: { data: orderDetails } }) => (
              <>
                <OrderDetailsMain
                  details={orderDetails}
                  orderDetailsFetching={orderDetailsQuery.isFetching}
                />
              </>
            ),
          )
          .with(
            {
              status: "pending",
            },
            () => <OrderDetailsSkeleton />,
          )
          .with(
            {
              status: "error",
            },
            ({ error }) => <OrderDetailsError errorMessage={error.message} />,
          )
          .exhaustive()}
      </section>
      {orderDetailsQuery.data && (
        <OrderFooter details={orderDetailsQuery.data.data} />
      )}
    </div>
  );
};

const OrderDetailsMain = ({
  details,
  orderDetailsFetching,
}: {
  details: inferRouterOutputs<AppRouter>["order"]["getOrderDetails"]["data"];
  orderDetailsFetching: boolean;
}) => {
  const {
    id: orderId,
    attributes: {
      createdAt,
      customerName,
      attentionTo,
      customerContact,
      customerAddress,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      fulfilment_method: fulfilmentMethod,
      fulfilmentStart,
      fulfilmentEnd,
      order_status: orderStatus,
      sales_channel: salesChannel,
      sales_agents: salesAgents,
      orderProducts,
      remarks,
      deliveryFee,
      updatedAt,
    },
  } = details;

  const queryContext = api.useUtils();
  const tmaPopup = usePopup();
  const tmaInitData = useInitData();
  const router = useRouter();

  const [statusId, setStatusId] = useState(orderStatus.data?.id ?? 0);

  const orderStatusQuery = api.orderStatus.getOrderStatuses.useQuery();
  const sendOrderDeletionMessageMutation =
    api.telegram.sendOrderDeletionMessage.useMutation();

  const sendStatusCancelledMutation =
    api.telegram.sendOrderCancelledUpdateMessage.useMutation();
  const sendStatusUpdateMessageMutation =
    api.telegram.sendOrderStatusUpdateMessage.useMutation();
  const updateOrderStatusMutation = api.order.updateOrderStatus.useMutation({
    onSuccess: ({ data }) => {
      // Send a telegram update message to the channel only for cancelled orders
      if (
        data.data.attributes.order_status.data.attributes.orderStatus
          .trim()
          .toLowerCase() === "cancelled"
      ) {
        sendStatusCancelledMutation.mutate({
          ...data,
          prevStatusName:
            orderStatus.data?.attributes.orderStatus ?? "no order status",
        });
      } else {
        sendStatusUpdateMessageMutation.mutate(data);
      }
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
  const deleteOrderMutation = api.order.deleteOrder.useMutation({
    onSuccess: ({ data }) => {
      sendOrderDeletionMessageMutation.mutate({
        ...data,
        chatId: tmaInitData?.user?.id ?? 0,
        deletedOn: new Date(),
      });
    },
    onSettled: () => {
      queryContext.order.getFilteredOrders.invalidate();
    },
  });

  const orderStatusLoading = useMemo(() => {
    if (updateOrderStatusMutation.isPending) return true;
    return (
      orderDetailsFetching &&
      updateOrderStatusMutation.variables?.orderId === orderId
    );
  }, [
    updateOrderStatusMutation.isPending,
    updateOrderStatusMutation.variables?.orderId,
    orderDetailsFetching,
    orderId,
  ]);

  const onDeleteOrder = () => {
    tmaPopup.open({
      title: "Delete Order",
      message: "Are you sure you want to delete this order?",
      buttons: [
        {
          type: "ok",
          id: "1",
        },
        {
          type: "cancel",
          id: "2",
        },
      ],
    });

    const onConfrimDeleteOrder = (payload: PopupClosedPayload) => {
      offTmaEvent("popup_closed", onConfrimDeleteOrder);

      if (payload.button_id !== "1") return;
      if (!tmaInitData?.user?.id) {
        tmaPopup.open({
          title: "Error",
          message: "Telegram user not found",
          buttons: [{ type: "ok" }],
        });
        return;
      }

      deleteOrderMutation.mutate(
        {
          orderId,
          chatId: tmaInitData.user.id,
        },
        {
          onError: (error) =>
            tmaPopup.open({
              title: "Error",
              message: error.message,
              buttons: [{ type: "ok" }],
            }),
          onSuccess: () => router.push("/orders"),
        },
      );
    };
    onTmaEvent("popup_closed", onConfrimDeleteOrder);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd MMM yyyy - h:mm a");
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-3">
      {/* Order details card */}
      <Card className="border-dashed">
        <CardHeader className="pb-4">
          <div className="mb-1 flex items-center justify-between">
            <CardTitle className="">Order #{orderId}</CardTitle>
            <Popover>
              <PopoverTrigger disabled={orderStatusLoading}>
                <Badge
                  className={cn(orderStatusLoading && "animate-pulse")}
                  variant={orderStatusLoading ? "secondary" : "default"}
                >
                  {orderStatusLoading
                    ? "Updating..."
                    : orderStatus.data?.attributes.orderStatus ?? "No status"}
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
                    <div
                      key={status.id}
                      className="flex items-center space-x-2"
                    >
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
                          "No status",
                      });
                    }}
                    disabled={
                      updateOrderStatusMutation.isPending ||
                      orderStatus.data?.id === statusId
                    }
                  >
                    Update status
                  </Button>
                </PopoverClose>
              </PopoverContent>
            </Popover>
          </div>
          <CardDescription>
            <div className="flex flex-col">
              <p className="flex items-center">
                <strong className="font-semibold">🕐 Created</strong>
                <Dot className="h-3.5 w-3.5" />
                <span className="font-light">{formatDateTime(createdAt)}</span>
              </p>
              <p className="flex items-center">
                <strong className="font-semibold">✍️ Last Updated</strong>
                <Dot className="h-3.5 w-3.5" />
                <span className="font-light">{formatDateTime(updatedAt)}</span>
              </p>
            </div>
          </CardDescription>
        </CardHeader>

        <Separator />

        {/* Customer information */}
        <CardContent className="py-4">
          <div className="flex flex-col space-y-0.5">
            {attentionTo && (
              <p className="flex flex-wrap items-center text-sm">
                <strong className="font-medium">📢 Attention To</strong>
                <Dot className="h-3.5 w-3.5" />
                <strong className="font-light">{attentionTo}</strong>
              </p>
            )}
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">👤 Customer Name</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">{customerName}</strong>
            </p>
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">📞 Customer Contact</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">{customerContact}</strong>
            </p>
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">🏠 Customer Address</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">{customerAddress}</strong>
            </p>
          </div>
        </CardContent>

        <Separator />

        {/* Order details */}
        <CardContent className="py-4">
          <div className="flex flex-col space-y-0.5">
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">💼 Fulfilment Method</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">
                {fulfilmentMethod.data?.attributes.fulfilmentMethod ??
                  "no fulfilment method"}
              </strong>
            </p>

            <p className="flex flex-wrap items-center text-sm">
              <span className="font-medium">📆 Fulfilment DT</span>
              <Dot className="h-3.5 w-3.5" />
              <div className="flex flex-col font-light">
                <span>
                  {fulfilmentStart
                    ? formatDateTime(fulfilmentStart)
                    : "No datetime set"}
                </span>
                {fulfilmentEnd && (
                  <span>
                    <span>to </span>
                    <span>{formatDateTime(fulfilmentEnd)}</span>
                  </span>
                )}
              </div>
            </p>
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">💸 Payment Method</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">
                {paymentMethod.data?.attributes.paymentMethod ??
                  "no payment method"}
              </strong>
            </p>
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">ℹ️ Payment Status</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">
                {paymentStatus.data?.attributes.paymentStatus ??
                  "no payment status"}
              </strong>
            </p>
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">🛒 Sales Channel</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">
                {salesChannel.data?.attributes.salesChannel ??
                  "no sales channel"}
              </strong>
            </p>
            {salesAgents.data.length > 0 && (
              <p className="flex items-center text-sm">
                <strong className="font-medium">🤝 Sales Agents</strong>
                <Dot className="h-3.5 w-3.5" />
                <strong className="font-light">
                  {salesAgents.data
                    .map((agent) => agent.attributes.name)
                    .join(", ")}
                </strong>
              </p>
            )}
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">🚚 Delivery Fee</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">${deliveryFee}</strong>
            </p>
          </div>
        </CardContent>

        <Separator />

        {/* Order products */}
        <CardContent className="py-4">
          <strong>
            <span className="text-sm font-medium">🛍️ Products</span>
          </strong>
          <div className="mt-2 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-12">Units</TableHead>
                  <TableHead className="w-12">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderProducts.map((orderProduct) => (
                  <TableRow key={orderProduct.productId}>
                    <TableCell>
                      <div>
                        <p className="font-normal text-muted-foreground">
                          SKU {orderProduct.sku}
                        </p>
                        <p className="font-medium">{orderProduct.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Label className="sr-only">Quantity</Label>
                        <p className="">x{orderProduct.quantity}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Label className="sr-only">Price</Label>
                        <p className="">${orderProduct.price}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <Separator />

        {/* Remarks */}
        <CardContent className="pt-4">
          <div className="flex flex-col">
            <span className="mb-2 text-sm font-medium">📝 Remarks</span>
            <Textarea
              className="bg-stone-50 shadow-inner"
              value={remarks}
              placeholder="No remarks provided"
              rows={4}
              readOnly
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete order card */}
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle>Delete Order</CardTitle>
          <CardDescription>
            The order will be permanently deleted. This action is irreversible
            and cannot be undone.
          </CardDescription>
        </CardHeader>

        <Separator />
        <CardFooter className="justify-end px-3 pb-3 pt-3">
          <Button
            variant="destructive"
            onClick={() => onDeleteOrder()}
            disabled={deleteOrderMutation.isPending}
          >
            {deleteOrderMutation.isPending ? "Deleting..." : "Delete Order"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const OrderDetailsError = ({ errorMessage }: { errorMessage: string }) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
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

const OrderDetailsSkeleton = () => {
  return (
    <div className="flex flex-1 flex-col gap-4 p-3">
      <Card className="border-dashed">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center pb-1">
            Order
            <Skeleton className="ml-1.5 h-5 w-10" />
          </CardTitle>
          <CardDescription>
            <div className="flex flex-col">
              <p className="flex items-center">
                <strong className="font-semibold">🕐 Created</strong>
                <Dot className="h-3.5 w-3.5" />
                <Skeleton className="h-4 w-32" />
              </p>
              <p className="flex items-center">
                <strong className="font-semibold">✍️ Last updated</strong>
                <Dot className="h-3.5 w-3.5" />
                <Skeleton className="h-4 w-32" />
              </p>
            </div>
          </CardDescription>
        </CardHeader>

        <Separator />

        {/* Customer information */}
        <CardContent className="py-4">
          <div className="flex flex-col space-y-0.5">
            <p className="flex items-center text-sm">
              <strong className="font-medium">👤 Customer Name</strong>
              <Dot className="h-3.5 w-3.5" />
              <Skeleton className="h-5 w-32" />
            </p>
            <p className="flex items-center text-sm">
              <strong className="font-medium">📞 Customer Contact</strong>
              <Dot className="h-3.5 w-3.5" />
              <Skeleton className="h-5 w-32" />
            </p>
            <p className="flex items-center text-sm">
              <strong className="font-medium">🏠 Customer Address</strong>
              <Dot className="h-3.5 w-3.5" />
              <Skeleton className="h-5 w-32" />
            </p>
          </div>
        </CardContent>

        <Separator />

        {/* Order details */}
        <CardContent className="py-4">
          <div className="flex flex-col space-y-0.5">
            <p className="flex items-center text-sm">
              <strong className="font-medium">💼 Fulfilment Method</strong>
              <Dot className="h-3.5 w-3.5" />
              <Skeleton className="h-5 w-32" />
            </p>
            <p className="flex items-center text-sm">
              <strong className="font-medium">📅 Fulfilment DT</strong>
              <Dot className="h-3.5 w-3.5" />
              <Skeleton className="h-5 w-32" />
            </p>
            <p className="flex items-center text-sm">
              <strong className="font-medium">💸 Payment Method</strong>
              <Dot className="h-3.5 w-3.5" />
              <Skeleton className="h-5 w-32" />
            </p>
            <p className="flex items-center text-sm">
              <strong className="font-medium">ℹ️ Payment Status</strong>
              <Dot className="h-3.5 w-3.5" />
              <Skeleton className="h-5 w-32" />
            </p>
            <p className="flex items-center text-sm">
              <strong className="font-medium">🛒 Sales Channel</strong>
              <Dot className="h-3.5 w-3.5" />
              <Skeleton className="h-5 w-32" />
            </p>
            <p className="flex items-center text-sm">
              <strong className="font-medium">🚚 Delivery Fee</strong>
              <Dot className="h-3.5 w-3.5" />
              <Skeleton className="h-5 w-32" />
            </p>
          </div>
        </CardContent>

        <Separator />

        {/* Order products */}
        <CardContent className="py-4">
          <strong>
            <span className="text-sm font-medium">🛍️ Products</span>
          </strong>
          <div className="mt-2 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-12">Units</TableHead>
                  <TableHead className="w-12">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <Skeleton className="h-5 w-32" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Label className="sr-only">Quantity</Label>
                        <Skeleton className="h-5 w-12" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Label className="sr-only">Price</Label>
                        <Skeleton className="h-5 w-12" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <Separator />

        {/* Remarks */}
        <CardContent className="pt-4">
          <div className="flex flex-col">
            <span className="mb-2 text-sm font-medium">📝 Remarks</span>
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const OrderSummary = ({
  details,
}: {
  details: inferRouterOutputs<AppRouter>["order"]["getOrderDetails"]["data"];
}) => {
  const {
    attributes: { deliveryFee, excludeGst, orderProducts },
  } = details;

  // Calculate prices for order
  const orderAmount = calculateTotalOrderAmount(
    orderProducts,
    deliveryFee ?? 0,
  );
  const gstPrice = calculateGstCost(orderAmount);
  const finalPrice = calculateOrderGrandTotal(
    orderProducts,
    deliveryFee ?? 0,
    excludeGst,
  );

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost">
          <Label>Grand Total:</Label>
          <p className="ml-1 font-semibold underline">
            ${finalPrice.toFixed(2)}
          </p>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Order Summary</DrawerTitle>
          <DrawerClose />
        </DrawerHeader>
        <DrawerDescription>
          <div className="p-4">
            <Table className="max-h-[80vh]">
              <TableHeader className="sticky top-0 bg-zinc-100">
                <TableRow>
                  <TableHead className="w-[100px] font-semibold">
                    Item
                  </TableHead>
                  <TableHead className="w-[100px] font-semibold">
                    No (x)
                  </TableHead>
                  <TableHead className="w-[100px] font-semibold">
                    Price ($)
                  </TableHead>
                  <TableHead className="w-[100px] text-right font-semibold">
                    Total ($)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderProducts.map((orderProduct, index) => (
                  <TableRow key={index}>
                    <TableCell>{orderProduct.sku}</TableCell>
                    <TableCell className="text-center">
                      {orderProduct.quantity}
                    </TableCell>
                    <TableCell className="text-center">
                      ${orderProduct.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${(orderProduct.quantity * orderProduct.price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="italic">Delivery Fee</TableCell>
                  <TableCell className="text-center">1</TableCell>
                  <TableCell className="text-center">
                    ${deliveryFee?.toFixed(2) ?? "0.00"}
                  </TableCell>
                  <TableCell className="text-right">
                    ${deliveryFee?.toFixed(2) ?? "0.00"}
                  </TableCell>
                </TableRow>
                {excludeGst && (
                  <TableRow>
                    <TableCell className="italic">
                      Exclude GST ({DEFAULT_GST_PERCENTAGE * 100}%)
                    </TableCell>
                    <TableCell className="text-center">1</TableCell>
                    <TableCell className="text-center">
                      -${gstPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      -${gstPrice.toFixed(2)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter className="sticky bottom-0 bg-zinc-100">
                <TableRow>
                  <TableCell colSpan={3} className="text-right text-primary">
                    <Label className="font-semibold">Grand Total:</Label>
                  </TableCell>
                  <TableCell
                    className="text-right font-semibold text-primary underline"
                    colSpan={1}
                  >
                    ${finalPrice.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </DrawerDescription>
      </DrawerContent>
    </Drawer>
  );
};

const OrderFooter = ({
  details,
}: {
  details: inferRouterOutputs<AppRouter>["order"]["getOrderDetails"]["data"];
}) => {
  const router = useRouter();
  const {
    id: orderId,
    attributes: {
      customerName,
      attentionTo,
      customerContact,
      customerAddress,
      fulfilmentStart,
      fulfilmentEnd,
      fulfilment_method: fulfilmentMethod,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      order_status: orderStatus,
      sales_channel: salesChannel,
      sales_agents: salesAgents,
      updatedAt,
      orderProducts,
      deliveryFee,
      remarks,
      excludeGst,
    },
  } = details;

  const tmaPopup = usePopup();
  const updateOrderForm = useOrderForm((store) => store.updateOrderForm);

  const onCopyOrder = () => {
    const fulfilmentDatetimeString = fulfilmentStart
      ? `${format(fulfilmentStart, "dd/MM/yyyy - h:mm a")}${fulfilmentEnd ? `\nto ${format(fulfilmentEnd, "dd/MM/yyyy h:mm a")}` : ""}`
      : "N/A";

    const copiedOrderText = `
Order #${orderId}
Last updated: ${format(new Date(updatedAt), "dd/MM/yyyy - h:mm a")}

1. Customer Information
- Name: ${customerName}${attentionTo ? `\n- Attn: ${attentionTo.trim()}` : ""}
- Contact: ${customerContact}
- Address: ${customerAddress}
- Payment: ${paymentMethod.data?.attributes.paymentMethod ?? "no payment method"}
- Payment status: ${paymentStatus.data?.attributes.paymentStatus ?? "no payment status"}

2. Order details
- Status: ${orderStatus.data?.attributes.orderStatus ?? "no order status"}
- Sales channel: ${salesChannel.data?.attributes.salesChannel ?? "no sales channel"}
- Sales agents: ${salesAgents.data.length > 0 ? salesAgents.data.map((agent) => agent.attributes.name).join(", ") : "N/A"}
- Fulfilment method: ${fulfilmentMethod.data?.attributes.fulfilmentMethod ?? "no fulfilment method"}
- Fulfilment datetime: 
${fulfilmentDatetimeString}
- Delivery fee: $${deliveryFee?.toFixed(2) ?? 0}
- Remarks: ${remarks}

3. Products included
${orderProducts
  .map(
    (product) => `
- Name: ${product.name}
- Quantity: x${product.quantity}
- Price: $${product.price}`,
  )
  .join("\n")
  .trim()}

Total price*: ${calculateOrderGrandTotal(orderProducts, deliveryFee ?? 0, excludeGst).toFixed(2)}

Payment details
🧾Please Paynow/Paylah to our Company UEN 202135539W (3 Elixir PTE LTD) indicating your Invoice Number under the reference/comment section. Thank you!
`;
    navigator.clipboard.writeText(copiedOrderText);

    tmaPopup.open({
      title: "Copy Order",
      message: "Order copied to clipboard",
      buttons: [
        {
          type: "ok",
        },
      ],
    });
  };

  const onEditOrder = () => {
    // Set order form state values via store to prefill the form
    updateOrderForm({
      customerName: details.attributes.customerName,
      hasAttentionTo: !!details.attributes.attentionTo,
      attentionTo: details.attributes.attentionTo ?? "",
      customerAddress: details.attributes.customerAddress,
      customerContact: details.attributes.customerContact,
      paymentMethod: {
        id: details.attributes.payment_method.data?.id.toString() ?? "0",
        name:
          details.attributes.payment_method.data?.attributes.paymentMethod ??
          "no payment method",
      },
      paymentStatus: {
        id: details.attributes.payment_status.data?.id.toString() ?? "0",
        name:
          details.attributes.payment_status.data?.attributes.paymentStatus ??
          "no payment status",
      },
      fulfilmentMethod: {
        id: details.attributes.fulfilment_method.data?.id.toString() ?? "0",
        name:
          details.attributes.fulfilment_method.data?.attributes
            .fulfilmentMethod ?? "no fulfilment method",
      },
      orderStatus: {
        id: details.attributes.order_status.data?.id.toString() ?? "0",
        name:
          details.attributes.order_status.data?.attributes.orderStatus ??
          "no order status",
      },
      salesChannel: {
        id: details.attributes.sales_channel.data?.id.toString() ?? "0",
        name:
          details.attributes.sales_channel.data?.attributes.salesChannel ??
          "no sales channel",
      },
      salesAgents: details.attributes.sales_agents.data.map((agent) => ({
        value: {
          id: agent.id.toString(),
          name: agent.attributes.name,
        },
      })),
      orderProducts: details.attributes.orderProducts,
      fulfilmentDates: {
        fulfilmentStart: details.attributes.fulfilmentStart
          ? new Date(details.attributes.fulfilmentStart)
          : new Date(),
        fulfilmentEnd: details.attributes.fulfilmentEnd
          ? new Date(details.attributes.fulfilmentEnd)
          : new Date(),
        hasEnd: !!details.attributes.fulfilmentEnd,
      },
      orderCollectionDateTime: new Date(
        details.attributes.orderCollectionDateTime,
      ),
      deliveryFee: details.attributes.deliveryFee ?? 0,
      remarks: details.attributes.remarks,
      excludeGst: details.attributes.excludeGst,
    });

    router.push(`/orders/${orderId}/edit`);
  };

  return (
    <footer className="sticky bottom-0 flex items-center justify-between gap-2 border-t bg-white p-3">
      <OrderSummary details={details} />
      <div className="flext items-center space-x-2">
        <Button variant="outline" onClick={() => onCopyOrder()}>
          Copy
        </Button>
        <Button onClick={() => onEditOrder()}>Edit</Button>
      </div>
    </footer>
  );
};

ViewOrderPage.getLayout = (page) => {
  return (
    <AuthGuard>
      <MainLayout title="📦 Order Details">{page}</MainLayout>
    </AuthGuard>
  );
};

export default ViewOrderPage;
