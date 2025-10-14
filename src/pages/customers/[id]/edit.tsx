import {
  useBackButton,
  useClosingBehavior,
  useInitData,
  useMainButton,
  useMiniApp,
  usePopup,
  useHapticFeedback,
  useThemeParams,
  useViewport,
} from "@tma.js/sdk-react";
import { on as registerTmaEvent, off as unregisterTmaEvent } from "@tma.js/sdk-react";
import { TRPCError } from "@trpc/server";
import { useParams } from "next/navigation";
import { useRouter } from "next/router";
import type { MiniAppsEventPayload } from "@tma.js/sdk-react";
import { useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import MainLayout from "~/components/layouts/MainLayout";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { AuthGuard } from "~/lib/contexts/AuthProvider";
import { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import { z } from "zod";
import { customerFormSchema } from "~/types/customer-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { match } from "ts-pattern";
import { useCustomerForm } from "~/stores/customer-form/useCustomerForm";

const EditCustomerPage: NextPageWithLayout = () => {
  const router = useRouter();
  const tmaBackButton = useBackButton();
  const params = useParams<{ id: string }>();

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
    <div className="flex h-full flex-col pt-4">
      <Card className="mx-4">
        <CardHeader>
          <CardTitle>Editing Product #{params.id}</CardTitle>
          <CardDescription>
            Change the details of the product below
          </CardDescription>
        </CardHeader>
      </Card>
      <CustomerForm />
    </div>
  );
};

const CustomerForm = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const tmaClosingBehavior = useClosingBehavior();
  const tmaMainButton = useMainButton();
  const tmaBackButton = useBackButton();
  const tmaHaptic = useHapticFeedback();
  const tmaThemeParams = useThemeParams();
  const tmaViewport = useViewport();
  const tmaPopup = usePopup();
  const tma = useMiniApp();

  const { updateCustomerForm, ...customerFormState } = useCustomerForm(
    (state) => state,
  );

  const salesChannelsQuery = api.salesChannel.getSalesChannels.useQuery();
  const customerUpdateMutation =
    api.customer.updateCustomerDetails.useMutation();

  // Step up tma main button to act as a submit button
  useEffect(() => {
    tmaMainButton.setParams({
      text: "Save Changes 💾",
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
      tmaMainButton.hide();
    };
  }, []);

  // Expand the viewport
  useEffect(() => {
    tmaViewport?.expand();
  }, []);

  // Register pop up confirmation on form submission to confirm customer update
  useEffect(() => {
    const onSubmission = async (event: MiniAppsEventPayload<"popup_closed">) => {
      if (event.button_id !== "ok") return;

      tmaHaptic.notificationOccurred("success");

      tmaMainButton.setParams({
        isLoaderVisible: true,
        isEnabled: false,
      });

      // Submit the customer creation request
      const payload = { ...form.getValues(), customerId: parseInt(params.id) };
      try {
        const customer = await customerUpdateMutation.mutateAsync(payload);
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

      router.back();
    };

    registerTmaEvent("popup_closed", onSubmission);

    return () => {
      unregisterTmaEvent("popup_closed", onSubmission);
    };
  }, []);

  const form = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: customerFormState,
  });

  const onSubmit: SubmitHandler<z.infer<typeof customerFormSchema>> = (
    _formValues,
  ) => {
    tmaHaptic.notificationOccurred("success");

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
          id: "cancel",
        },
      ],
    });
  };

  const onErrors: SubmitErrorHandler<z.infer<typeof customerFormSchema>> = (
    errors,
  ) => {
    console.error(errors);
    tmaHaptic.notificationOccurred("error");
  };

  // Update the tmaMainButton color based on the form state
  if (!form.formState.isValid) {
    tmaMainButton.setParams({
      bgColor: "#71717a",
      textColor: "#d4d4d8",
    });
  } else {
    tmaMainButton.setParams({
      bgColor: tmaThemeParams.buttonColor,
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

          {/* Attention to */}
          <FormField
            control={form.control}
            name="attentionTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  <span>Attention To</span>
                  <FormMessage />
                </FormLabel>
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

EditCustomerPage.getLayout = (page) => {
  return (
    <AuthGuard>
      <MainLayout title="📝 Edit Product">{page}</MainLayout>
    </AuthGuard>
  );
};

export default EditCustomerPage;
