import {
  useBackButton,
  useMainButton,
  usePostEvent,
  useThemeParams,
} from "@tma.js/sdk-react";
import { useEffect, useMemo, useState } from "react";
import { TmaSDKLoader } from "@components/layouts/TmaSdkLoader";
import { NextPageWithLayout } from "~/pages/_app";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SubmitErrorHandler,
  SubmitHandler,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { format, isBefore, isEqual } from "date-fns";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@components/ui/form";
import { Input } from "@components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { Button } from "@components/ui/button";
import { CalendarIcon } from "@radix-ui/react-icons";
import { cn } from "~/lib/utils";
import { Calendar } from "@components/ui/calendar";
import {
  SALES_CHANNELS_WITH_SALES_AGENTS,
  orderFormStep2Schema,
} from "@schema/order-schema";
import { useRouter } from "next/router";
import MainLayout from "@components/layouts/MainLayout";
import OrderFormLayout from "@components/layouts/OrderFormLayout";
import { TimePicker } from "@components/ui/time-picker";
import { Trash2 } from "lucide-react";
import { useOrderForm } from "@stores/order-form/useOrderForm";
import { api } from "~/utils/api";
import { match } from "ts-pattern";
import { AppRouter } from "~/server/api/root";
import { inferRouterOutputs } from "@trpc/server";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { AuthGuard } from "~/lib/contexts/AuthProvider";

const CreateOrdersPage: NextPageWithLayout = () => {
  const router = useRouter();
  const tmaMainButton = useMainButton();
  const tmaBackButton = useBackButton();
  const tmaPostEvent = usePostEvent();
  const tmaThemeParams = useThemeParams();

  const { updateOrderForm, ...orderFormState } = useOrderForm((store) => store);

  const form = useForm<z.infer<typeof orderFormStep2Schema>>({
    resolver: zodResolver(orderFormStep2Schema),
    defaultValues: {
      orderStatus: orderFormState.orderStatus,
      salesChannel: orderFormState.salesChannel,
      salesAgents: orderFormState.salesAgents,
      fulfilmentMethod: orderFormState.fulfilmentMethod,
      fulfilmentDates: {
        hasEnd: orderFormState.fulfilmentDates.hasEnd,
        fulfilmentStart: orderFormState.fulfilmentDates.fulfilmentStart,
        fulfilmentEnd: orderFormState.fulfilmentDates.fulfilmentEnd,
      },
      orderCollectionDateTime: orderFormState.orderCollectionDateTime,
    },
  });

  // state to determine if sales agents input should be shown
  const allowSalesAgents = SALES_CHANNELS_WITH_SALES_AGENTS.map((channel) =>
    channel.toLowerCase(),
  ).includes(form.watch("salesChannel").name.toLowerCase());

  const {
    fields: salesAgentArray,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "salesAgents",
  });

  const fulfilmentMethodsQuery = api.order.getFulfilmentMethods.useQuery();
  const salesAgentsQuery = api.salesAgent.getSalesAgents.useQuery();
  const salesChannelsQuery = api.salesChannel.getSalesChannels.useQuery();
  const orderStatusesQuery = api.orderStatus.getOrderStatuses.useQuery();

  // Use the tmaMainButton as the form submit button
  useEffect(() => {
    tmaMainButton.setParams({
      text: "Next Step ➡️",
      isEnabled: true,
      isLoaderVisible: false,
    });

    // Register the main button to submit the form
    const onButtonClick = () => form.handleSubmit(onSubmit, onErrors)();
    tmaMainButton.on("click", onButtonClick);

    tmaMainButton.show();

    return () => {
      tmaMainButton.off("click", onButtonClick);
    };
  }, []);

  // Use the tmaBackButton as the back button
  useEffect(() => {
    // Register the back button
    const onBackButtonClick = () => {
      updateOrderForm(form.getValues());
      router.back();
    };
    tmaBackButton.on("click", onBackButtonClick);
    tmaBackButton.show();

    return () => {
      tmaBackButton.off("click", onBackButtonClick);
    };
  });

  const onSubmit: SubmitHandler<z.infer<typeof orderFormStep2Schema>> = (
    formValues,
  ) => {
    // Trigger telegram feedbacks
    tmaMainButton.disable();
    tmaMainButton.showLoader();
    tmaPostEvent("web_app_trigger_haptic_feedback", {
      type: "notification",
      notification_type: "success",
    });

    // Update the order form state and navigate to the next step
    updateOrderForm(formValues);
    router.push("/orders/create-step3");
  };

  const onErrors: SubmitErrorHandler<z.infer<typeof orderFormStep2Schema>> = (
    errors,
  ) => {
    console.error(errors);
    tmaPostEvent("web_app_trigger_haptic_feedback", {
      type: "notification",
      notification_type: "error",
    });
  };

  // Update the tmaMainButton color based on the form state
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
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-6 p-5 pb-10 pt-4">
          {/* Current status of order */}
          <FormField
            control={form.control}
            name="orderStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order Status</FormLabel>
                <Select
                  onValueChange={(id) => {
                    const obj = orderStatusesQuery.data?.data.find(
                      (status) => status.id.toString() === id,
                    );
                    field.onChange({
                      id: obj?.id.toString() ?? "",
                      name: obj?.attributes.orderStatus ?? "",
                    });
                  }}
                  defaultValue={field.value.id}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          <span className="text-muted-foreground">
                            Select order status
                          </span>
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {match(orderStatusesQuery)
                      .with(
                        { status: "success" },
                        ({ data: { data: statues } }) =>
                          statues.map((status) => (
                            <SelectItem
                              key={status.id}
                              value={status.id.toString()}
                            >
                              {status.attributes.orderStatus}
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
                            Error loading order statuses
                          </span>
                        ),
                      )
                      .exhaustive()}
                  </SelectContent>
                </Select>
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
                <Select
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
                </Select>
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
                                    const agent =
                                      salesAgentsQuery.data?.data.find(
                                        (agent) =>
                                          agent.id.toString() === value,
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

          {/* Fulfilment method */}
          <FormField
            control={form.control}
            name="fulfilmentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fulfilment Method</FormLabel>
                <Select
                  onValueChange={(id) => {
                    const method = fulfilmentMethodsQuery.data?.data.find(
                      (method) => method.id.toString() === id,
                    );
                    field.onChange({
                      id: method?.id.toString() ?? "",
                      name: method?.attributes.fulfilmentMethod ?? "",
                    });
                  }}
                  defaultValue={field.value.id}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          <span className="text-muted-foreground">
                            Select Fulfilment method
                          </span>
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {match(fulfilmentMethodsQuery)
                      .with(
                        { status: "success" },
                        ({ data: { data: methods } }) =>
                          methods.map((method) => (
                            <SelectItem
                              key={method.id}
                              value={method.id.toString()}
                            >
                              {method.attributes.fulfilmentMethod}
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
                            Error loading Fulfilment methods
                          </span>
                        ),
                      )
                      .exhaustive()}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Please select the method of order Fulfilment.
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
                    <FormLabel className="text-xs">End datetime</FormLabel>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="End datetime"
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
                              const newDate = date
                                ? new Date(date)
                                : new Date();
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
                        <FormLabel className="font-normal">
                          End Datetime
                        </FormLabel>
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
                                const newDate = date
                                  ? new Date(date)
                                  : new Date();
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
            {form.formState.errors.fulfilmentDates &&
              !form.formState.isValid && (
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
        </div>
      </form>
    </Form>
  );
};

CreateOrdersPage.getLayout = (page) => {
  return (
    <AuthGuard>
      <MainLayout title="📝 Create Order">
        <OrderFormLayout
          title="Order Details"
          description="Please provide the following order details."
          currentStep={2}
        >
          {page}
        </OrderFormLayout>
      </MainLayout>
    </AuthGuard>
  );
};

export default CreateOrdersPage;
