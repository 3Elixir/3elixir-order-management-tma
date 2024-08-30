import { zodResolver } from "@hookform/resolvers/zod";
import {
  useBackButton,
  useMainButton,
  useThemeParams,
  usePostEvent,
  usePopup,
  useClosingBehavior,
} from "@tma.js/sdk-react";
import { on as registerTmaEvent, off as unregisterTmaEvent } from "@tma.js/sdk";
import { inferRouterOutputs } from "@trpc/server";
import { useParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import {
  type UseFormReturn,
  type SubmitHandler,
  type SubmitErrorHandler,
  useForm,
  useFieldArray,
} from "react-hook-form";
import { match } from "ts-pattern";
import { z } from "zod";
import MainLayout from "~/components/layouts/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { NextPageWithLayout } from "~/pages/_app";
import { AppRouter } from "~/server/api/root";
import {
  SALES_CHANNELS_WITH_SALES_AGENTS,
  orderFormSchema,
} from "~/types/order-schema";
import { api } from "~/utils/api";
import { type PopupClosedPayload } from "node_modules/@tma.js/sdk/dist/dts/bridge/events/parsers/popupClosed";
import { Button } from "~/components/ui/button";
import {
  CalendarIcon,
  PlusCircle,
  SquareArrowOutUpRight,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { format, isBefore } from "date-fns";
import { Calendar } from "~/components/ui/calendar";
import { TimePicker } from "~/components/ui/time-picker";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table,
} from "~/components/ui/table";
import { Label } from "~/components/ui/label";
import { useOrderForm } from "@stores/order-form/useOrderForm";
import { Textarea } from "~/components/ui/textarea";
import { DropDown } from "~/components/ui/dropdown";
import { Switch } from "~/components/ui/switch";
import { AuthGuard } from "~/lib/contexts/AuthProvider";

const EditOrderPage: NextPageWithLayout = () => {
  const router = useRouter();
  const tmaBackButton = useBackButton();
  const params = useParams() as { id: string } | null;

  const orderDetailsQuery = api.order.getOrderDetails.useQuery(
    {
      orderId: params?.id ?? "",
    },
    {
      enabled: !!params?.id,
    },
  );

  // show tma back button to navigate back to the previous page
  useEffect(() => {
    const onBackButtonPress = () => {
      router.back();
    };
    tmaBackButton.on("click", onBackButtonPress);
    tmaBackButton.show();

    return () => {
      tmaBackButton.off("click", onBackButtonPress);
      tmaBackButton.hide();
    };
  }, []);

  return (
    <section className="p-3">
      {match(orderDetailsQuery)
        .with(
          {
            status: "success",
          },
          ({ data: { data: orderDetails } }) => (
            <div className="flex h-full flex-col">
              <Card>
                <CardHeader>
                  <CardTitle>Editing Order #{orderDetails.id}</CardTitle>
                  <CardDescription>
                    Change the details of the order below
                  </CardDescription>
                </CardHeader>
              </Card>
              <OrderEditForm orderDetails={orderDetails} />
            </div>
          ),
        )
        .with(
          {
            status: "pending",
          },
          () => (
            <div className="flex h-96 flex-1 items-center justify-center text-2xl font-semibold text-gray-500">
              Loading...
            </div>
          ),
        )
        .with(
          {
            status: "error",
          },
          ({ error }) => <OrderDetailsError errorMessage={error.message} />,
        )
        .exhaustive()}
    </section>
  );
};

const OrderEditForm = ({
  orderDetails,
}: {
  orderDetails: inferRouterOutputs<AppRouter>["order"]["getOrderDetails"]["data"];
}) => {
  const queryContext = api.useUtils();
  const router = useRouter();
  const tmaPostEvent = usePostEvent();
  const tmaMainButton = useMainButton();
  const tmaThemeParams = useThemeParams();
  const tmaPopup = usePopup();
  const tmaClosingBehavior = useClosingBehavior();

  const { updateOrderForm, ...orderFormState } = useOrderForm((store) => store);
  const sendOrderDetailsUpdateMessageMutation =
    api.telegram.sendOrderDetailsUpdateMessage.useMutation();
  const sendOrderCancelledUpdateMessageMutation =
    api.telegram.sendOrderCancelledUpdateMessage.useMutation();

  const orderUpdateMutation = api.order.updateOrderDetails.useMutation({
    onSuccess: ({ data }) => {
      if (data.data.attributes.order_status.data.id === 4) {
        sendOrderCancelledUpdateMessageMutation.mutate({
          ...data,
          prevStatusName:
            orderDetails.attributes.order_status.data?.attributes.orderStatus ??
            "no order status",
        });
      } else {
        sendOrderDetailsUpdateMessageMutation.mutate(data);
      }
    },
    onSettled: () => {
      queryContext.order.getOrderDetails.invalidate({
        orderId: orderDetails.id.toString(),
      });
    },
  });

  const form = useForm<z.infer<typeof orderFormSchema>>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      ...orderFormState,
    },
  });

  // show tma main button to allow user to save the edited order
  useEffect(() => {
    tmaMainButton.setParams({
      text: "Save Changes",
      isEnabled: true,
    });

    const onMainButtonPress = () => form.handleSubmit(onSubmit, onErrors)();
    tmaMainButton.on("click", onMainButtonPress);
    tmaMainButton.show();

    return () => {
      tmaMainButton.off("click", onMainButtonPress);
      tmaMainButton.hide();
    };
  }, []);

  // Enable closing confirmation
  useEffect(() => {
    tmaClosingBehavior.enableConfirmation();

    return () => {
      tmaClosingBehavior.disableConfirmation();
    };
  }, []);

  // Register the tmaPopup event
  useEffect(() => {
    const onSubmission = async (event: PopupClosedPayload) => {
      if (event.button_id !== "ok") return;

      tmaPostEvent("web_app_trigger_haptic_feedback", {
        type: "notification",
        notification_type: "success",
      });

      tmaMainButton.setParams({
        isLoaderVisible: true,
        isEnabled: false,
      });

      // Submit the order
      const payload = {
        ...form.getValues(),
        orderId: orderDetails.id,
      };

      const response = await orderUpdateMutation.mutateAsync(payload);
      if (!response.success) {
        tmaMainButton.setParams({
          isLoaderVisible: false,
          isEnabled: true,
        });
        return tmaPopup.open({
          title: "Error",
          message: response.message,
          buttons: [{ type: "ok" }],
        });
      }

      tmaMainButton.setParams({
        isLoaderVisible: false,
        isEnabled: true,
      });

      router.back();
    };

    registerTmaEvent("popup_closed", onSubmission);

    return () => {
      unregisterTmaEvent("popup_closed", onSubmission);
    };
  }, []);

  const onSubmit: SubmitHandler<z.infer<typeof orderFormSchema>> = (
    formValues,
  ) => {
    tmaPostEvent("web_app_trigger_haptic_feedback", {
      type: "notification",
      notification_type: "success",
    });

    tmaPopup.open({
      title: "Confirm Changes",
      message: "Are you sure you want to save the changes?",
      buttons: [
        {
          type: "ok",
          id: "ok",
        },
        {
          type: "cancel",
        },
      ],
    });
  };

  const onErrors: SubmitErrorHandler<z.infer<typeof orderFormSchema>> = (
    errors,
  ) => {
    tmaPostEvent("web_app_trigger_haptic_feedback", {
      type: "notification",
      notification_type: "error",
    });
    console.error(errors);
  };

  // Update the tmaMainButton color based on the form validity
  useEffect(() => {
    if (!form.formState.isValid) {
      tmaMainButton.setParams({
        backgroundColor: "#71717a",
        textColor: "#d4d4d8",
      });
    } else {
      tmaMainButton.setParams({
        backgroundColor: tmaThemeParams.buttonColor,
        textColor: tmaThemeParams.buttonTextColor,
      });
    }
  }, [form.formState.isValid]);

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-6 p-2 pb-10 pt-4">
          <OrderFormCustomerFields form={form} />
          <OrderFormDetailFields form={form} />
          <OrderFormProductFields form={form} />
          <OrderFormSummaryFields form={form} />
        </div>
      </form>
    </Form>
  );
};

const OrderFormCustomerFields = ({
  form,
}: {
  form: UseFormReturn<z.infer<typeof orderFormSchema>>;
}) => {
  const paymentMethodsQuery = api.order.getPaymentMethods.useQuery();
  const paymentStatusesQuery = api.order.getPaymentStatuses.useQuery();
  const [hasAttentionTo, setHasAttentionTo] = useState(
    () => !!form.getValues("attentionTo"),
  );

  return (
    <>
      {/* Customer Name */}
      <FormField
        control={form.control}
        name="customerName"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Customer Name</FormLabel>
              <div className="flex items-center space-x-2 rounded-md border p-1 ps-2.5 shadow">
                <Label className="text-xs" htmlFor="attention-to">
                  Attention To
                </Label>
                <Switch
                  checked={hasAttentionTo}
                  onCheckedChange={setHasAttentionTo}
                  id="attention-to"
                  aria-label="Attention To"
                />
              </div>
            </div>
            <FormControl>
              <Input className="text-base" placeholder="Bryan" {...field} />
            </FormControl>
            <FormDescription>
              Please provide the full name of the customer.
            </FormDescription>
          </FormItem>
        )}
      />

      {/* Attention To */}
      {hasAttentionTo && (
        <FormField
          control={form.control}
          name="attentionTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attention To</FormLabel>
              <FormControl>
                <Input
                  className="text-base"
                  placeholder="Accounts Payable"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Intended recipient of the correspondence
              </FormDescription>
            </FormItem>
          )}
        />
      )}

      {/* Customer Address */}
      <FormField
        control={form.control}
        name="customerAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Customer Address</FormLabel>
            <FormControl>
              <Input
                className="text-base"
                placeholder="467A Sembawang Drive ..."
                {...field}
              />
            </FormControl>
            <FormDescription>Please provide the full address.</FormDescription>
          </FormItem>
        )}
      />

      {/* Customer Address */}
      <FormField
        control={form.control}
        name="customerContact"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Customer Contact</FormLabel>
            <FormControl>
              <Input className="text-base" placeholder="8921 1123" {...field} />
            </FormControl>
            <FormDescription>
              Please provide a contact number for the customer.
            </FormDescription>
          </FormItem>
        )}
      />

      {/* Payment Method */}
      <FormField
        control={form.control}
        name="paymentMethod"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Payment Method</FormLabel>
            <DropDown
              selected={{
                value: field.value.id,
                name: field.value.name,
              }}
              onChange={(value) => {
                const method = paymentMethodsQuery.data?.data.find(
                  (method) => method.id.toString() === value,
                );
                field.onChange({
                  id: method?.id.toString() ?? "",
                  name: method?.attributes.paymentMethod ?? "",
                });
              }}
              options={
                paymentMethodsQuery.data?.data.map((method) => ({
                  value: method.id.toString(),
                  name: method.attributes.paymentMethod,
                })) ?? []
              }
            />

            <FormDescription>
              Please select the payment method for this order.
            </FormDescription>
          </FormItem>
        )}
      />

      {/* Payment Status */}
      <FormField
        control={form.control}
        name="paymentStatus"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Payment Status</FormLabel>
            <DropDown
              selected={{
                value: field.value.id,
                name: field.value.name,
              }}
              onChange={(value) => {
                const status = paymentStatusesQuery.data?.data.find(
                  (status) => status.id.toString() === value,
                );
                field.onChange({
                  id: status?.id.toString() ?? "",
                  name: status?.attributes.paymentStatus ?? "",
                });
              }}
              options={
                paymentStatusesQuery.data?.data.map((status) => ({
                  value: status.id.toString(),
                  name: status.attributes.paymentStatus,
                })) ?? []
              }
            />
            <FormDescription>
              Please select the payment status for this order.
            </FormDescription>
          </FormItem>
        )}
      />
    </>
  );
};

const OrderFormDetailFields = ({
  form,
}: {
  form: UseFormReturn<z.infer<typeof orderFormSchema>>;
}) => {
  const salesAgentsQuery = api.salesAgent.getSalesAgents.useQuery();
  const salesChannelsQuery = api.salesChannel.getSalesChannels.useQuery();
  const orderStatusesQuery = api.orderStatus.getOrderStatuses.useQuery();
  const fulfilmentMethodsQuery = api.order.getFulfilmentMethods.useQuery();

  // state to determine if sales agents input should be shown
  const allowSalesAgents = SALES_CHANNELS_WITH_SALES_AGENTS.map((c) =>
    c.toLowerCase().trim(),
  ).includes(form.watch("salesChannel").name.toLowerCase().trim());

  const {
    fields: salesAgentArray,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "salesAgents",
  });

  // Tag the sales agents options with isSelected property to enable/disable them in the select dropdown
  const getSalesAgentOptions = (
    agents: inferRouterOutputs<AppRouter>["salesAgent"]["getSalesAgents"]["data"],
  ) => {
    const selectedSalesAgents = form.getValues().salesAgents;
    const agentOptions = agents.map((agent) => {
      const isSelected = selectedSalesAgents.some(
        (selectedAgent) => selectedAgent.value.id === agent.id.toString(),
      );
      return {
        id: agent.id.toString(),
        attributes: agent.attributes,
        isSelected,
      };
    });
    return agentOptions;
  };

  const shouldAllowMoreAgents = useMemo(() => {
    return salesAgentArray.length < (salesAgentsQuery.data?.data.length ?? 0);
  }, [salesAgentArray, salesAgentsQuery.data]);

  return (
    <>
      {/* Current status of order */}
      <FormField
        control={form.control}
        name="orderStatus"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Order Status</FormLabel>

            <DropDown
              selected={{
                value: field.value.id,
                name: field.value.name,
              }}
              onChange={(value) => {
                const obj = orderStatusesQuery.data?.data.find(
                  (status) => status.id.toString() === value,
                );
                field.onChange({
                  id: obj?.id.toString() ?? "",
                  name: obj?.attributes.orderStatus ?? "",
                });
              }}
              options={
                orderStatusesQuery.data?.data.map((status) => ({
                  value: status.id.toString(),
                  name: status.attributes.orderStatus,
                })) ?? []
              }
            />
            <FormDescription>
              Please select the current status of the order.
            </FormDescription>
          </FormItem>
        )}
      />

      {/* Sales Channel */}
      <FormField
        control={form.control}
        name="salesChannel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sales Channel</FormLabel>
            <DropDown
              selected={{
                value: field.value.id,
                name: field.value.name,
              }}
              onChange={(value) => {
                const channel = salesChannelsQuery.data?.data.find(
                  (channel) => channel.id.toString() === value,
                );
                field.onChange({
                  id: channel?.id.toString() ?? "",
                  name: channel?.attributes.salesChannel ?? "",
                });
              }}
              options={
                salesChannelsQuery.data?.data.map((channel) => ({
                  value: channel.id.toString(),
                  name: channel.attributes.salesChannel,
                })) ?? []
              }
            />
            {/* <Select
              onValueChange={(value) => {
                const channel = salesChannelsQuery.data?.data.find(
                  (channel) => channel.id.toString() === value,
                );
                field.onChange({
                  id: channel?.id.toString() ?? "",
                  name: channel?.attributes.salesChannel ?? "",
                });
              }}
              defaultValue={field.value.id}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      <span className="text-muted-foreground">
                        Select sales channel
                      </span>
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {match(salesChannelsQuery)
                  .with(
                    { status: "success" },
                    ({ data: { data: salesChannels } }) =>
                      salesChannels.map((channel) => (
                        <SelectItem
                          key={channel.id}
                          value={channel.id.toString()}
                        >
                          {channel.attributes.salesChannel}
                        </SelectItem>
                      )),
                  )
                  .with(
                    {
                      status: "pending",
                    },
                    () => <span className="px-2 text-sm">Loading...</span>,
                  )
                  .with(
                    {
                      status: "error",
                    },
                    () => (
                      <span className="px-2 text-sm">
                        Error loading sales channels
                      </span>
                    ),
                  )
                  .exhaustive()}
              </SelectContent>
            </Select> */}
            <FormDescription>
              Specify which sales channel the order came from.
            </FormDescription>
          </FormItem>
        )}
      />

      {/* Sales Agent */}
      {allowSalesAgents && (
        <div className="flex flex-col">
          <FormField
            control={form.control}
            name="salesAgents"
            render={() => (
              <FormItem>
                <FormLabel>Sales Agents</FormLabel>
                <div className="mt-3 flex flex-col gap-2">
                  {salesAgentArray.map((field, index) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`salesAgents.${index}.value`}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex gap-2">
                            <Select
                              onValueChange={(value) => {
                                const agent = salesAgentsQuery.data?.data.find(
                                  (agent) => agent.id.toString() === value,
                                );
                                field.onChange({
                                  id: agent?.id.toString() ?? "",
                                  name: agent?.attributes.name ?? "",
                                });
                              }}
                              defaultValue={field.value.id}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      <span className="text-muted-foreground">
                                        Select sales agent
                                      </span>
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {match(salesAgentsQuery)
                                  .with(
                                    {
                                      status: "pending",
                                    },
                                    () => (
                                      <span className="px-2 text-sm">
                                        Loading...
                                      </span>
                                    ),
                                  )
                                  .with(
                                    {
                                      status: "error",
                                    },
                                    () => (
                                      <span className="px-2 text-sm">
                                        Error loading sales agents
                                      </span>
                                    ),
                                  )
                                  .with(
                                    {
                                      status: "success",
                                    },
                                    ({ data: { data: salesAgents } }) =>
                                      getSalesAgentOptions(salesAgents).map(
                                        (agent) => (
                                          <SelectItem
                                            key={agent.id}
                                            value={agent.id.toString()}
                                            disabled={agent.isSelected}
                                          >
                                            {agent.attributes.name}
                                          </SelectItem>
                                        ),
                                      ),
                                  )
                                  .exhaustive()}
                              </SelectContent>
                            </Select>

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                  {shouldAllowMoreAgents && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          value: {
                            id: "",
                            name: "",
                          },
                        })
                      }
                    >
                      Add Sales Agent
                    </Button>
                  )}
                </div>
                {form.formState.errors.salesAgents &&
                  !form.formState.isValid && (
                    <p
                      className={cn(
                        "text-[0.8rem] font-medium text-destructive",
                      )}
                    >
                      {form.formState.errors.salesAgents?.root?.message}
                    </p>
                  )}
                <FormDescription className="mt-2">
                  Add sales agents who are responsible for this order.
                </FormDescription>
              </FormItem>
            )}
          />
        </div>
      )}

      {/* Fulfilment method  */}
      <FormField
        control={form.control}
        name="fulfilmentMethod"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Fulfilment Method</FormLabel>
            <DropDown
              selected={{
                value: field.value.id,
                name: field.value.name,
              }}
              onChange={(value) => {
                const method = fulfilmentMethodsQuery.data?.data.find(
                  (method) => method.id.toString() === value,
                );
                field.onChange({
                  id: method?.id.toString() ?? "",
                  name: method?.attributes.fulfilmentMethod ?? "",
                });
              }}
              options={
                fulfilmentMethodsQuery.data?.data.map((method) => ({
                  value: method.id.toString(),
                  name: method.attributes.fulfilmentMethod,
                })) ?? []
              }
            />
            <FormDescription>
              Please select the fulfilment method for this order.
            </FormDescription>
          </FormItem>
        )}
      />

      {/* Order Fulfilment Datetime */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <Label
            className={cn(
              form.formState.errors.fulfilmentDates &&
                !form.formState.isValid &&
                "text-destructive",
            )}
          >
            Fulfilment Datetime
          </Label>

          <FormField
            control={form.control}
            name="fulfilmentDates.hasEnd"
            render={({ field }) => (
              <div className="flex items-center space-x-2 rounded-md border p-1 ps-2.5 shadow">
                <FormLabel className="text-xs">End Datetime</FormLabel>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    // Set the end date to be the same as the start date when the switch is checked
                    if (checked) {
                      form.setValue(
                        "fulfilmentDates.fulfilmentEnd",
                        form.getValues().fulfilmentDates.fulfilmentStart,
                      );
                    }
                    field.onChange(checked);
                  }}
                  aria-label="End Datetime"
                />
              </div>
            )}
          />
        </div>

        {/* Start and end datetimes */}
        <div className="flex flex-col space-y-2">
          {/* Fulfilment start datetime*/}
          <FormField
            control={form.control}
            name="fulfilmentDates.fulfilmentStart"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <div className="flex items-center gap-2">
                  {form.watch("fulfilmentDates.hasEnd") ? (
                    <FormLabel className="font-normal">
                      Start Datetime
                    </FormLabel>
                  ) : (
                    <FormLabel className="font-normal">Datetime</FormLabel>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "flex-grow pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PP h:mm a")
                          ) : (
                            <span>Pick a date and time</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          const newDate = date ? new Date(date) : new Date();
                          newDate.setHours(12, 0, 0, 0);
                          field.onChange(newDate);
                          form.setValue(
                            "fulfilmentDates.fulfilmentEnd",
                            newDate,
                          );
                        }}
                        defaultMonth={field.value}
                        initialFocus
                      />
                      <div className="border-t border-border p-3">
                        <TimePicker
                          setDate={field.onChange}
                          date={field.value}
                          hasSeconds={false}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </FormItem>
            )}
          />

          {/* Fulfilment end datetime*/}
          {form.watch("fulfilmentDates.hasEnd") && (
            <FormField
              control={form.control}
              name="fulfilmentDates.fulfilmentEnd"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <FormLabel className="font-normal">End Datetime</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "flex-grow pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PP h:mm a")
                            ) : (
                              <span>Pick a date and time</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            const newDate = date ? new Date(date) : new Date();
                            newDate.setHours(12, 0, 0, 0);
                            field.onChange(newDate);
                          }}
                          disabled={(date) => {
                            // Disable dates that is before the start date
                            const targetDate = new Date(date);
                            targetDate.setHours(12, 0, 0, 0);
                            return isBefore(
                              targetDate,
                              form.watch("fulfilmentDates.fulfilmentStart"),
                            );
                          }}
                          defaultMonth={field.value}
                          initialFocus
                        />
                        <div className="border-t border-border p-3">
                          <TimePicker
                            setDate={field.onChange}
                            date={field.value}
                            hasSeconds={false}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Error message */}
        {form.formState.errors.fulfilmentDates && !form.formState.isValid && (
          <p className={cn("text-[0.8rem] font-medium text-destructive")}>
            {form.formState.errors.fulfilmentDates?.root?.message}
          </p>
        )}

        <FormDescription>
          {form.watch("fulfilmentDates.hasEnd")
            ? "Please select the start and end date and time for order Fulfilment."
            : "Please select the date and time for order Fulfilment."}
        </FormDescription>
      </div>
    </>
  );
};

const OrderFormProductFields = ({
  form,
}: {
  form: UseFormReturn<z.infer<typeof orderFormSchema>>;
}) => {
  const router = useRouter();

  const updateOrderForm = useOrderForm((store) => store.updateOrderForm);
  const { fields: orderProducts, remove: removeOrderProduct } = useFieldArray({
    control: form.control,
    name: "orderProducts",
  });

  const onRemoveOrderProduct = (index: number, productId: number) => {
    removeOrderProduct(index);
    updateOrderForm({
      orderProducts: orderProducts.filter(
        (orderProduct) => orderProduct.productId !== productId,
      ),
    });
  };

  const onNavigateToProducts = () => {
    updateOrderForm(form.getValues());
    router.push("/products?from=order");
  };

  return (
    <FormField
      control={form.control}
      name="orderProducts"
      render={() => (
        <FormItem>
          <FormLabel>Products</FormLabel>
          {orderProducts.length ? (
            <Card>
              <CardContent className="p-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Item</TableHead>
                      <TableHead className="w-[80px]">No (x)</TableHead>
                      <TableHead>Price ($)</TableHead>
                      <TableHead>
                        <p className="text-center">...</p>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderProducts.map((orderProduct, index) => (
                      <TableRow key={orderProduct.productId}>
                        <TableCell className="font-semibold">
                          {orderProduct.name}
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`orderProducts.${index}.quantity`}
                            render={({ field: { onChange, ...field } }) => (
                              <div>
                                <Label className="sr-only">Quantity</Label>
                                <Input
                                  type="number"
                                  className="text-base"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  onChange={(e) =>
                                    onChange(parseInt(e.target.value))
                                  }
                                  {...field}
                                />
                              </div>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`orderProducts.${index}.price`}
                            render={({ field: { onChange, ...field } }) => (
                              <div>
                                <Label className="sr-only">Price</Label>
                                <Input
                                  type="number"
                                  className="text-base"
                                  inputMode="decimal"
                                  onChange={(e) =>
                                    onChange(parseFloat(e.target.value))
                                  }
                                  {...field}
                                />
                              </div>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="gap-1"
                            onClick={() =>
                              onRemoveOrderProduct(
                                index,
                                orderProduct.productId,
                              )
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="justify-center border-t p-2">
                <Button
                  className="gap-1"
                  variant="ghost"
                  size="default"
                  onClick={() => onNavigateToProducts()}
                >
                  <PlusCircle className="h-4 w-4" />
                  Add More Products
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400">
              <p className="text-4xl">🛍️</p>
              <h3 className="mt-2 block text-sm font-semibold text-gray-900">
                No products added
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding products from the catalog.
              </p>
              <Button
                type="button"
                className="mt-6"
                onClick={() => onNavigateToProducts()}
              >
                <SquareArrowOutUpRight
                  className="-ml-0.5 mr-1.5 h-5 w-5"
                  aria-hidden="true"
                />
                Browse products
              </Button>
            </div>
          )}
        </FormItem>
      )}
    />
  );
};

const OrderFormSummaryFields = ({
  form,
}: {
  form: UseFormReturn<z.infer<typeof orderFormSchema>>;
}) => {
  return (
    <>
      {/* Delivery Fee */}
      <FormField
        control={form.control}
        name="deliveryFee"
        render={({ field: { onChange, ...field } }) => (
          <FormItem>
            <FormLabel>Delivery Fee ($)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Enter the delivery fee"
                min={0}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  onChange(value);
                }}
                {...field}
              />
            </FormControl>
            <FormDescription>
              Enter the delivery fee for the order. Leave it as $0 if there is
              no delivery fee.
            </FormDescription>
          </FormItem>
        )}
      />

      {/* Remarks */}
      <FormField
        control={form.control}
        name="remarks"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Remarks</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter any additional information here"
                className="resize-none text-base"
                rows={4}
                {...field}
              />
            </FormControl>
            <FormDescription>
              Include any addtional information such as delivery instructions,
              special requests, etc.
            </FormDescription>
          </FormItem>
        )}
      />
    </>
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

EditOrderPage.getLayout = (page) => {
  return (
    <AuthGuard>
      <MainLayout title="📝 Edit Order">{page}</MainLayout>
    </AuthGuard>
  );
};

export default EditOrderPage;
