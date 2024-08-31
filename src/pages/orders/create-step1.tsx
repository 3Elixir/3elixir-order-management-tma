import {
  useBackButton,
  useMainButton,
  usePostEvent,
  useThemeParams,
  useViewport,
} from "@tma.js/sdk-react";
import { useEffect, useState } from "react";
import { NextPageWithLayout } from "~/pages/_app";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler, SubmitErrorHandler } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@components/ui/form";
import { Input } from "@components/ui/input";
import { orderFormStep1Schema } from "@schema/order-schema";
import { useRouter } from "next/router";
import MainLayout from "~/components/layouts/MainLayout";
import OrderFormLayout from "~/components/layouts/OrderFormLayout";
import { useOrderForm } from "@stores/order-form/useOrderForm";
import { api } from "~/utils/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { match } from "ts-pattern";
import { DropDown } from "~/components/ui/dropdown";
import { AuthGuard } from "~/lib/contexts/AuthProvider";
import { buttonVariants } from "~/components/ui/button";
import { SquareArrowOutUpRight, UserRoundCheck, X } from "lucide-react";
import Link from "next/link";
import { cn } from "~/lib/utils";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

const CreateOrdersPage: NextPageWithLayout = () => {
  const router = useRouter();
  const tmaMainButton = useMainButton();
  const tmaBackButton = useBackButton();
  const tmaPostEvent = usePostEvent();
  const tmaThemeParams = useThemeParams();
  const tmaViewport = useViewport();
  const { updateOrderForm, ...orderFormState } = useOrderForm((store) => store);

  const form = useForm<z.infer<typeof orderFormStep1Schema>>({
    resolver: zodResolver(orderFormStep1Schema),
    defaultValues: {
      hasAttentionTo: orderFormState.hasAttentionTo,
      attentionTo: orderFormState.attentionTo,
      customerName: orderFormState.customerName,
      customerContact: orderFormState.customerContact,
      customerAddress: orderFormState.customerAddress,
      paymentMethod: orderFormState.paymentMethod,
      paymentStatus: orderFormState.paymentStatus,
    },
  });

  const paymentMethodsQuery = api.order.getPaymentMethods.useQuery();
  const paymentStatusesQuery = api.order.getPaymentStatuses.useQuery();

  // Use the tmaMainButton as the next button
  useEffect(() => {
    tmaMainButton.setParams({
      text: "Next Step ➡️",
      isEnabled: true,
      isLoaderVisible: false,
    });

    // Subscribe to the button click event
    const onButtonClick = () => {
      form.handleSubmit(onSubmit, onErrors)();
    };
    tmaMainButton.on("click", onButtonClick);

    tmaMainButton.show();

    return () => {
      tmaMainButton.off("click", onButtonClick);
    };
  }, []);

  // Hide the back button and expand the viewport
  useEffect(() => {
    tmaViewport.expand();
    tmaBackButton.hide();
  }, []);

  const onSubmit: SubmitHandler<z.infer<typeof orderFormStep1Schema>> = (
    formValues,
  ) => {
    tmaMainButton.showLoader();
    tmaMainButton.disable();

    tmaPostEvent("web_app_trigger_haptic_feedback", {
      type: "notification",
      notification_type: "success",
    });

    updateOrderForm(formValues);
    router.push("/orders/create-step2");
  };

  const onErrors: SubmitErrorHandler<z.infer<typeof orderFormStep1Schema>> = (
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

  return (
    <div>
      <div className="px-5 pb-2 pt-4">
        {orderFormState.customerId ? (
          <Alert className="relative">
            <UserRoundCheck className="h-4 w-4" />
            <div></div>
            <AlertTitle>Customer selected!</AlertTitle>
            <AlertDescription>
              <span>
                Click{" "}
                <Link href="/customers?from=order" className="underline">
                  {orderFormState.customerName}
                </Link>{" "}
                to change
              </span>
            </AlertDescription>
          </Alert>
        ) : (
          <Link
            href="/customers?from=order"
            className={buttonVariants({
              className: "w-full",
            })}
          >
            <SquareArrowOutUpRight className="-ml-0.5 mr-1.5 h-5 w-5" />
            Prefill Customer Information
          </Link>
        )}
      </div>
      <Form {...form}>
        <form>
          <div className="space-y-6 p-5 pb-10 pt-4">
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
                        checked={form.watch("hasAttentionTo")}
                        onCheckedChange={(checked) =>
                          form.setValue("hasAttentionTo", checked, {
                            shouldTouch: true,
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        id="attention-to"
                        aria-label="Attention To"
                      />
                    </div>
                  </div>
                  <FormControl>
                    <Input
                      className="text-base"
                      placeholder="Bryan"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Please provide the full name of the customer.
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Only render attention to field based on switch */}
            {form.watch("hasAttentionTo") && (
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
                  <FormDescription>
                    Please provide the full address.
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Customer Contact */}
            <FormField
              control={form.control}
              name="customerContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Contact</FormLabel>
                  <FormControl>
                    <Input
                      className="text-base"
                      placeholder="8921 1123"
                      {...field}
                    />
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
                      name: field.value.name,
                      value: field.value.id,
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
                        name: method.attributes.paymentMethod,
                        value: method.id.toString(),
                      })) ?? []
                    }
                    placeholder={
                      <span className="text-muted-foreground">
                        Select payment method
                      </span>
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
                  <Select
                    onValueChange={(value) => {
                      const status = paymentStatusesQuery.data?.data.find(
                        (status) => status.id.toString() === value,
                      );
                      field.onChange({
                        id: status?.id.toString() ?? "",
                        name: status?.attributes.paymentStatus ?? "",
                      });
                    }}
                    defaultValue={field.value.id}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            <span className="text-muted-foreground">
                              Select payment status
                            </span>
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {match(paymentStatusesQuery)
                        .with(
                          { status: "success" },
                          ({ data: { data: paymentStatuses } }) =>
                            paymentStatuses.map((status) => (
                              <SelectItem
                                key={status.id}
                                value={status.id.toString()}
                              >
                                {status.attributes.paymentStatus}
                              </SelectItem>
                            )),
                        )
                        .with(
                          {
                            status: "pending",
                          },
                          () => (
                            <span className="px-2 text-sm">Loading...</span>
                          ),
                        )
                        .with(
                          {
                            status: "error",
                          },
                          () => (
                            <span className="px-2 text-sm">
                              Error loading payment statuses
                            </span>
                          ),
                        )
                        .exhaustive()}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Please select the payment status for this order.
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </div>
  );
};

CreateOrdersPage.getLayout = (page) => {
  return (
    <AuthGuard>
      <MainLayout title="📝 Create Order">
        <OrderFormLayout
          title="Customer Details"
          description="Please provide the following customer details."
          currentStep={1}
        >
          {page}
        </OrderFormLayout>
      </MainLayout>
    </AuthGuard>
  );
};

export default CreateOrdersPage;
