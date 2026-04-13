import {
  useBackButton,
  useMainButton,
  usePopup,
  useMiniApp,
  useInitData,
  useClosingBehavior,
  useHapticFeedback,
  MiniAppsEventPayload,
} from "@tma.js/sdk-react";
import { on as registerTmaEvent, off as unregisterTmaEvent } from "@tma.js/sdk-react";
import { useEffect } from "react";
import { NextPageWithLayout } from "~/pages/_app";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SubmitErrorHandler,
  SubmitHandler,
  useForm,
  UseFormReturn,
} from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@components/ui/form";
import {
  orderFormStep3Schema,
  orderFormStep4Schema,
} from "../../types/order-schema";
import { useRouter } from "next/router";
import MainLayout from "@components/layouts/MainLayout";
import OrderFormLayout from "@components/layouts/OrderFormLayout";
import { Textarea } from "~/components/ui/textarea";
import { useOrderForm } from "@stores/order-form/useOrderForm";
import { api } from "~/utils/api";
import { flushSync } from "react-dom";
import { AuthGuard } from "~/lib/contexts/AuthProvider";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Switch } from "~/components/ui/switch";
import {
  calculateGstCost,
  calculateOrderGrandTotal,
  calculateTotalOrderAmount,
  DEFAULT_GST_PERCENTAGE,
} from "~/lib/orderUtils";

const CreateOrdersPage: NextPageWithLayout = () => {
  const router = useRouter();
  const tma = useMiniApp();
  const tmaMainButton = useMainButton();
  const tmaBackButton = useBackButton();
  const tmaPopup = usePopup();
  const tmaInitData = useInitData();
  const tmaClosingBehavior = useClosingBehavior();
  const tmaHaptic = useHapticFeedback();
  const { updateOrderForm, ...orderFormState } = useOrderForm((store) => store);

  const orderCreationMutation = api.order.createOrder.useMutation();

  const form = useForm<z.infer<typeof orderFormStep4Schema>>({
    resolver: zodResolver(orderFormStep4Schema),
    defaultValues: {
      remarks: orderFormState.remarks,
      deliveryFee: orderFormState.deliveryFee,
      excludeGst: orderFormState.excludeGst,
    },
  });

  // Use the tmaMainButton as the form submit button
  useEffect(() => {
    tmaMainButton.setParams({
      text: "Create Order 🚀",
      isEnabled: true,
      bgColor: "#16a34a",
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
    const onSubmission = async (
      event: MiniAppsEventPayload<"popup_closed">,
    ) => {
      if (event.button_id !== "ok") return;
      if (!tmaInitData) return;
      if (!tmaInitData.user) return;

      tmaHaptic.notificationOccurred("success");

      tmaMainButton.setParams({
        isLoaderVisible: true,
        isEnabled: false,
      });

      // Submit the order
      const payload = {
        ...orderFormState,
        remarks: form.getValues("remarks"),
        deliveryFee: form.getValues("deliveryFee"),
        excludeGst: form.getValues("excludeGst"),
        chatId: tmaInitData.user.id,
      };
      const response = await orderCreationMutation.mutateAsync(payload);
      if (!response.success) {
        tmaMainButton.setParams({
          isLoaderVisible: false,
          isEnabled: true,
        });
        return tmaPopup.open({
          title: "Notification Issue",
          message: response.message,
          buttons: [{ type: "ok" }],
        }).finally(() => {
          tmaClosingBehavior.disableConfirmation();
          tma.close();
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
    <>
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
                      className="text-base"
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
                    Enter the delivery fee for the order. Leave it as $0 if
                    there is no delivery fee.
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
      <OrderSummaryFooter form={form} />
    </>
  );
};

const OrderSummaryFooter = ({
  form,
}: {
  form: UseFormReturn<z.infer<typeof orderFormStep4Schema>>;
}) => {
  const deliveryFee = form.watch("deliveryFee");
  const excludeGst = form.watch("excludeGst");
  const orderProducts = useOrderForm((store) => store.orderProducts);

  // Calculate prices for order
  const orderAmount = calculateTotalOrderAmount(orderProducts, deliveryFee);
  const gstPrice = calculateGstCost(orderAmount);
  const finalPrice = calculateOrderGrandTotal(
    orderProducts,
    deliveryFee,
    excludeGst,
  );

  return (
    <div className="sticky bottom-0 flex justify-between border-t bg-white px-4 py-3 shadow">
      <Form {...form}>
        <FormField
          control={form.control}
          name="excludeGst"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2 space-y-0">
              <FormControl>
                <Switch
                  checked={!field.value}
                  onCheckedChange={(checked) => field.onChange(!checked)}
                  aria-label="exclude-gst"
                />
              </FormControl>
              <FormLabel>Add GST</FormLabel>
            </FormItem>
          )}
        />
      </Form>

      <Drawer>
        <DrawerTrigger asChild>
          <Button type="button">
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
                        $
                        {(orderProduct.quantity * orderProduct.price).toFixed(
                          2,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="italic">Delivery Fee</TableCell>
                    <TableCell className="text-center">1</TableCell>
                    <TableCell className="text-center">
                      ${deliveryFee.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${deliveryFee.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  {!form.watch("excludeGst") && (
                    <TableRow>
                      <TableCell className="italic">
                        GST ({DEFAULT_GST_PERCENTAGE * 100}%)
                      </TableCell>
                      <TableCell className="text-center">1</TableCell>
                      <TableCell className="text-center">
                        ${gstPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${gstPrice.toFixed(2)}
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
    </div>
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
