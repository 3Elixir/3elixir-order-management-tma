import {
  useBackButton,
  useMainButton,
  useHapticFeedback,
  useThemeParams,
} from "@tma.js/sdk-react";
import { useEffect } from "react";
import { NextPageWithLayout } from "~/pages/_app";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SubmitErrorHandler,
  SubmitHandler,
  UseFormReturn,
  useFieldArray,
  useForm,
} from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@components/ui/form";
import { orderFormStep3Schema } from "../../types/order-schema";
import { useRouter } from "next/router";
import MainLayout from "@components/layouts/MainLayout";
import OrderFormLayout from "@components/layouts/OrderFormLayout";
import { useOrderForm } from "@stores/order-form/useOrderForm";
import {
  Copy,
  CopyPlus,
  PlusCircle,
  SquareArrowOutUpRight,
  X,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
} from "~/components/ui/table";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { AuthGuard } from "~/lib/contexts/AuthProvider";

const CreateOrdersPage: NextPageWithLayout = () => {
  const router = useRouter();
  const tmaMainButton = useMainButton();
  const tmaBackButton = useBackButton();
  const tmaThemeParams = useThemeParams();
  const tmaHaptic = useHapticFeedback();

  const { updateOrderForm, ...orderFormState } = useOrderForm((store) => store);

  const form = useForm<z.infer<typeof orderFormStep3Schema>>({
    resolver: zodResolver(orderFormStep3Schema),
    defaultValues: {
      orderProducts: orderFormState.orderProducts,
    },
  });

  const orderProducts = form.watch("orderProducts");

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

  const onSubmit: SubmitHandler<z.infer<typeof orderFormStep3Schema>> = (
    formValues,
  ) => {
    tmaMainButton.disable();
    tmaMainButton.showLoader();

    tmaHaptic.notificationOccurred("success");

    updateOrderForm(formValues);
    router.push("/orders/create-step4");
  };

  const onErrors: SubmitErrorHandler<z.infer<typeof orderFormStep3Schema>> = (
    errors,
  ) => {
    tmaHaptic.notificationOccurred("error");
    console.error("Form errors", errors);
  };

  // Update the tmaMainButton color based on the form state
  if (!form.formState.isValid || !orderProducts.length) {
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
    <>
      <Form {...form}>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-grow flex-col p-4"
        >
          <FormField
            control={form.control}
            name="orderProducts"
            render={() => (
              <FormItem>
                <FormLabel>Product Cart</FormLabel>
                {orderProducts.length ? (
                  <OrderProductList form={form} />
                ) : (
                  <EmptyOrderProduct />
                )}
              </FormItem>
            )}
          />
        </form>
      </Form>
      <OrderProductFooter form={form} />
    </>
  );
};

const EmptyOrderProduct = () => {
  const router = useRouter();

  return (
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
        onClick={() => router.push("/products?from=order")}
      >
        <SquareArrowOutUpRight
          className="-ml-0.5 mr-1.5 h-5 w-5"
          aria-hidden="true"
        />
        Browse products
      </Button>
    </div>
  );
};

const OrderProductList = ({
  form,
}: {
  form: UseFormReturn<z.infer<typeof orderFormStep3Schema>>;
}) => {
  const router = useRouter();
  const updateOrderForm = useOrderForm((store) => store.updateOrderForm);
  const {
    fields: orderProducts,
    remove: removeOrderProduct,
    insert: insertOrderProduct,
  } = useFieldArray({
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

  const onDuplicateOrderProduct = (index: number) => {
    const orderProduct = orderProducts.at(index);
    if (!orderProduct) return;

    insertOrderProduct(index + 1, {
      ...orderProduct,
      quantity: 1, // Reset quantity for the new product
    });
  };

  return (
    <Card>
      <CardContent className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="min-w-16">No (x)</TableHead>
              <TableHead className="min-w-24">Price ($)</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderProducts.map((orderProduct, index) => (
              <TableRow key={`${orderProduct.productId}-${index}`}>
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
                          className="text-center text-base"
                          inputMode="numeric"
                          min={1}
                          pattern="[0-9]*"
                          onChange={(e) => onChange(parseInt(e.target.value))}
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
                          className="text-center text-base"
                          inputMode="decimal"
                          onChange={(e) => onChange(parseFloat(e.target.value))}
                          {...field}
                        />
                      </div>
                    )}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {/* Delete button */}
                    <Button
                      size="icon"
                      variant="destructive"
                      className="gap-1"
                      onClick={() =>
                        onRemoveOrderProduct(index, orderProduct.productId)
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>

                    {/* Duplicate button */}
                    <Button
                      size="icon"
                      variant="outline"
                      className="gap-1"
                      onClick={() => onDuplicateOrderProduct(index)}
                    >
                      <CopyPlus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
  );
};

const OrderProductFooter = ({
  form,
}: {
  form: UseFormReturn<z.infer<typeof orderFormStep3Schema>>;
}) => {
  const totalOrderPrice = form
    .watch()
    .orderProducts.reduce(
      (total, { quantity, price }) => total + quantity * price,
      0,
    )
    .toFixed(2);

  const orderProducts = form.watch("orderProducts");

  return (
    <div className="sticky bottom-0 flex justify-between border-t bg-white px-4 py-3 shadow">
      <Drawer>
        <DrawerTrigger asChild>
          <Button type="button" className="ml-auto">
            <Label>Cart Total:</Label>
            <p className="ml-1 font-semibold underline underline-offset-2">
              ${totalOrderPrice}
            </p>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Cart Summary</DrawerTitle>
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
                </TableBody>
                <TableFooter className="sticky bottom-0 bg-zinc-100">
                  <TableRow>
                    <TableCell colSpan={3} className="text-right text-primary">
                      <Label className="font-semibold">Cart Total:</Label>
                    </TableCell>
                    <TableCell
                      className="text-right font-semibold text-primary underline"
                      colSpan={1}
                    >
                      ${totalOrderPrice}
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
          title="Product Details"
          description="Please provide the products for the order."
          currentStep={3}
        >
          {page}
        </OrderFormLayout>
      </MainLayout>
    </AuthGuard>
  );
};

export default CreateOrdersPage;
