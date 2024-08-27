import { AuthGuard } from "~/lib/contexts/AuthProvider";
import { NextPageWithLayout } from "~/pages/_app";
import MainLayout from "~/components/layouts/MainLayout";
import { api } from "~/utils/api";
import { TRPCError } from "@trpc/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { match } from "ts-pattern";
import { z } from "zod";
import { customerFormSchema } from "~/types/customer-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { defaultInitState as defaultCustomerFormState } from "~/stores/customer-form/customer-form-store";
import {
  useBackButton,
  useClosingBehavior,
  useInitData,
  useMainButton,
  useMiniApp,
  usePopup,
  usePostEvent,
  useThemeParams,
  useViewport,
} from "@tma.js/sdk-react";
import { on as registerTmaEvent, off as unregisterTmaEvent } from "@tma.js/sdk";
import { useEffect } from "react";
import { PopupClosedPayload } from "node_modules/@tma.js/sdk/dist/dts/bridge/events/parsers/popupClosed";

const CreateCustomerPage: NextPageWithLayout = () => {
  return (
    <div className="flex h-full flex-col pt-4">
      <Card className="mx-4">
        <CardHeader>
          <CardTitle>New Customer</CardTitle>
          <CardDescription>
            Fill in the required customer details below
          </CardDescription>
        </CardHeader>
      </Card>
      <CustomerForm />
    </div>
  );
};

const CustomerForm = () => {
  const tmaClosingBehavior = useClosingBehavior();
  const tmaMainButton = useMainButton();
  const tmaBackButton = useBackButton();
  const tmaPostEvent = usePostEvent();
  const tmaThemeParams = useThemeParams();
  const tmaViewport = useViewport();
  const tmaPopup = usePopup();
  const tmaInitData = useInitData();
  const tma = useMiniApp();

  const customerCreationMutation = api.customer.createCustomer.useMutation();
  const sendCustomerCreationMessageMutation =
    api.telegram.sendCustomerCreationMessage.useMutation();
  const salesChannelsQuery = api.salesChannel.getSalesChannels.useQuery();

  // Step up tma main button to act as a submit button
  useEffect(() => {
    tmaMainButton.setParams({
      text: "Create Customer 🚀",
      backgroundColor: "#16a34a",
      isLoaderVisible: false,
      isEnabled: true,
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

  // Register pop up confirmation on form submission to confirm product creation
  useEffect(() => {
    const onSubmission = async (event: PopupClosedPayload) => {
      if (event.button_id !== "ok") return;
      if (!tmaInitData) return;
      if (!tmaInitData.user) return;

      tmaPostEvent("web_app_trigger_haptic_feedback", {
        type: "notification",
        notification_type: "success",
      });

      tmaMainButton.setParams({
        isLoaderVisible: true,
        isEnabled: false,
      });

      // Submit the customer creation request
      const payload = form.getValues();
      try {
        const customer = await customerCreationMutation.mutateAsync(payload);
        await sendCustomerCreationMessageMutation.mutateAsync({
          chatId: tmaInitData.user.id,
          customerId: customer.data.id,
          customerName: customer.data.attributes.customerName,
        });
      } catch (error) {
        tmaMainButton.setParams({
          isLoaderVisible: false,
          isEnabled: true,
        });

        return tmaPopup.open({
          title: "Error",
          message:
            error instanceof TRPCError
              ? error.message
              : "Something went wrong, try again later.",
          buttons: [{ type: "ok" }],
        });
      }

      tmaMainButton.setParams({
        isLoaderVisible: false,
        isEnabled: true,
      });

      tmaClosingBehavior.disableConfirmation();
      tma.close();
    };

    registerTmaEvent("popup_closed", onSubmission);

    return () => {
      unregisterTmaEvent("popup_closed", onSubmission);
    };
  }, []);

  const form = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: defaultCustomerFormState,
  });

  const onSubmit: SubmitHandler<z.infer<typeof customerFormSchema>> = (
    _formValues,
  ) => {
    tmaPostEvent("web_app_trigger_haptic_feedback", {
      type: "notification",
      notification_type: "success",
    });

    tmaPopup.open({
      title: "Create Customer",
      message: "Are you sure you want to create this customer?",
      buttons: [
        {
          type: "ok",
          id: "ok",
        },
        {
          type: "cancel",
          id: "cancel",
        },
      ],
    });
  };

  const onErrors: SubmitErrorHandler<z.infer<typeof customerFormSchema>> = (
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
    <div className="flex flex-grow flex-col">
      <Form {...form}>
        <div className="space-y-6 p-5 pb-10 pt-4">
          {/* Customer name */}
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  <div>
                    <span>Customer Name</span>
                    <span className="ml-1 text-red-500">*</span>
                  </div>
                  <FormMessage />
                </FormLabel>
                <FormControl>
                  <Input className="text-base" placeholder="Bryan" {...field} />
                </FormControl>
                <FormDescription>Name of customer</FormDescription>
              </FormItem>
            )}
          />

          {/* Customer contact */}
          <FormField
            control={form.control}
            name="customerContact"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  <div>
                    <span>Customer Contact</span>
                    <span className="ml-1 text-red-500">*</span>
                  </div>
                  <FormMessage />
                </FormLabel>
                <FormControl>
                  <Input
                    className="text-base"
                    placeholder="89011231"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Phone contact of customer</FormDescription>
              </FormItem>
            )}
          />

          {/* Customer address */}
          <FormField
            control={form.control}
            name="customerAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  <div>
                    <span>Customer Address</span>
                  </div>
                  <FormMessage />
                </FormLabel>
                <FormControl>
                  <Input
                    className="text-base"
                    placeholder="Sembawang Drive 489b ..."
                    {...field}
                  />
                </FormControl>
                <FormDescription>Preferred mailing address</FormDescription>
              </FormItem>
            )}
          />

          {/* Sales channel */}
          <FormField
            control={form.control}
            name="salesChannel"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  <div>
                    <span>Sales Channel</span>
                    <span className="ml-1 text-red-500">*</span>
                  </div>
                  <FormMessage>
                    {formState.errors.salesChannel?.id?.message}
                  </FormMessage>
                </FormLabel>
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
                        ({ data: { data: channels } }) =>
                          channels.map((channel) => (
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
                            Error loading channels
                          </span>
                        ),
                      )
                      .exhaustive()}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Default sales channel of the customer
                </FormDescription>
              </FormItem>
            )}
          />
        </div>
      </Form>
    </div>
  );
};

CreateCustomerPage.getLayout = (page) => {
  return (
    <AuthGuard>
      <MainLayout title="📝 Create Customer">{page}</MainLayout>
    </AuthGuard>
  );
};

export default CreateCustomerPage;
