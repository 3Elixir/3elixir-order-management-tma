import {
  useBackButton,
  useMainButton,
  usePopup,
  useMiniApp,
  useInitData,
  useClosingBehavior,
  usePostEvent,
} from "@tma.js/sdk-react";
import { on as registerTmaEvent, off as unregisterTmaEvent } from "@tma.js/sdk";
import { type PopupClosedPayload } from "node_modules/@tma.js/sdk/dist/dts/bridge/events/parsers/popupClosed";
import { useEffect } from "react";
import { TmaSDKLoader } from "@components/layouts/TmaSdkLoader";
import { NextPageWithLayout } from "~/pages/_app";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@components/ui/form";
import { orderFormStep4Schema } from "../../types/order-schema";
import { useRouter } from "next/router";
import MainLayout from "@components/layouts/MainLayout";
import OrderFormLayout from "@components/layouts/OrderFormLayout";
import { Textarea } from "~/components/ui/textarea";
import { useOrderForm } from "@stores/order-form/useOrderForm";
import { api } from "~/utils/api";
import { flushSync } from "react-dom";
import { Input } from "~/components/ui/input";
import { AuthGuard } from "~/lib/contexts/AuthProvider";

const CreateOrdersPage: NextPageWithLayout = () => {
  const router = useRouter();
  const tma = useMiniApp();
  const tmaMainButton = useMainButton();
  const tmaBackButton = useBackButton();
  const tmaPopup = usePopup();
  const tmaInitData = useInitData();
  const tmaClosingBehavior = useClosingBehavior();
  const tmaPostEvent = usePostEvent();
  const { updateOrderForm, ...orderFormState } = useOrderForm((store) => store);

  const orderCreationMutation = api.order.createOrder.useMutation();

  const form = useForm<z.infer<typeof orderFormStep4Schema>>({
    resolver: zodResolver(orderFormStep4Schema),
    defaultValues: {
      remarks: orderFormState.remarks,
      deliveryFee: orderFormState.deliveryFee,
    },
  });

  // Use the tmaMainButton as the form submit button
  useEffect(() => {
    tmaMainButton.setParams({
      text: "Create Order 🚀",
      isEnabled: true,
      backgroundColor: "#16a34a",
      isLoaderVisible: false,
    });

    // Register the main button to submit the form
    const onButtonClick = () => form.handleSubmit(onSubmit, onError)();
    tmaMainButton.on("click", onButtonClick);

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

  // Register the tmaPopup event
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

      // Submit the order
      const payload = {
        ...orderFormState,
        remarks: form.getValues("remarks"),
        deliveryFee: form.getValues("deliveryFee"),
        chatId: tmaInitData.user.id,
      };
      const response = await orderCreationMutation.mutateAsync(payload);
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

      tmaClosingBehavior.disableConfirmation();
      tma.close();
    };

    registerTmaEvent("popup_closed", onSubmission);

    return () => {
      unregisterTmaEvent("popup_closed", onSubmission);
    };
  }, []);

  const onSubmit: SubmitHandler<z.infer<typeof orderFormStep4Schema>> = (
    formValues,
  ) => {
    flushSync(() => updateOrderForm(formValues));
    tmaPopup.open({
      title: "Submit Order",
      message: "Are you sure you want to submit this order?",
      buttons: [
        { type: "destructive", text: "cancel" },
        { type: "ok", id: "ok" },
      ],
    });
  };

  const onError: SubmitErrorHandler<z.infer<typeof orderFormStep4Schema>> = (
    errors,
    e,
  ) => {
    console.error(errors, e);
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-6 p-6 pb-10 pt-4">
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
                    inputMode="decimal"
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
                  Enter the delivery fee for the order. Leave it as $0 if there
                  is no delivery fee.
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
                  Include any addtional information such as delivery
                  instructions, special requests, etc.
                </FormDescription>
              </FormItem>
            )}
          />
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
          title="Order Summary"
          description="Please provide any additional information for the order."
          currentStep={4}
        >
          {page}
        </OrderFormLayout>
      </MainLayout>
    </AuthGuard>
  );
};

export default CreateOrdersPage;
