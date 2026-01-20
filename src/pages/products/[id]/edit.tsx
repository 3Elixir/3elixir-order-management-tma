import { zodResolver } from "@hookform/resolvers/zod";
import {
  useBackButton,
  useClosingBehavior,
  useMainButton,
  usePopup,
  usePostEvent,
  useThemeParams,
  useViewport,
} from "@tma.js/sdk-react";
import { on as registerTmaEvent, off as unregisterTmaEvent } from "@tma.js/sdk";
import { PopupClosedPayload } from "node_modules/@tma.js/sdk/dist/dts/bridge/events/parsers/popupClosed";
import { useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import MainLayout from "~/components/layouts/MainLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { NextPageWithLayout } from "~/pages/_app";
import { productFormSchema } from "~/types/product-schema";
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
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import { useParams } from "next/navigation";
import { useProductForm } from "~/stores/product-form/useProductForm";
import { AuthGuard } from "~/lib/contexts/AuthProvider";

const EditProductPage: NextPageWithLayout = () => {
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
      <ProductForm />
    </div>
  );
};

const ProductForm = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const tmaMainButton = useMainButton();
  const tmaPostEvent = usePostEvent();
  const tmaThemeParams = useThemeParams();
  const tmaViewport = useViewport();
  const tmaPopup = usePopup();

  const { updateProductForm, ...productFormState } = useProductForm(
    (state) => state,
  );

  const productBrandsQuery = api.product.getBrands.useQuery();
  const productCategoriesQuery = api.product.getCategories.useQuery();

  const productUpdateMutation = api.product.updateProductDetails.useMutation();

  // Step up tma main button to act as a submit button
  useEffect(() => {
    tmaMainButton.setParams({
      text: "Save Changes 💾",
      isLoaderVisible: false,
      isEnabled: true,
    });

    // Subscribe to the button click event
    const onButtonClick = () => form.handleSubmit(onSubmit, onErrors)();
    tmaMainButton.on("click", onButtonClick);
    tmaMainButton.show();

    return () => {
      tmaMainButton.off("click", onButtonClick);
      tmaMainButton.hide();
    };
  }, []);

  // Expand the viewport
  useEffect(() => {
    tmaViewport.expand();
  }, []);

  // Register pop up confirmation on form submission to confirm product update
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

      // Submit the updated product details
      const payload = { ...form.getValues(), productId: parseInt(params.id) };
      const response = await productUpdateMutation.mutateAsync(payload);
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

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: productFormState,
  });

  const onSubmit: SubmitHandler<z.infer<typeof productFormSchema>> = (
    _formValues,
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
          id: "cancel",
        },
      ],
    });
  };

  const onErrors: SubmitErrorHandler<z.infer<typeof productFormSchema>> = (
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
          {/* Product SKU */}
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  <div>
                    <span>Product SKU</span>
                    <span className="ml-1 text-red-500">*</span>
                  </div>
                  <FormMessage />
                </FormLabel>
                <FormControl>
                  <Input
                    className="text-base"
                    placeholder="HK-1234"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The unique identifier for the product
                </FormDescription>
              </FormItem>
            )}
          />

          {/* Product Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  <div>
                    <span>Product Name</span>
                    <span className="ml-1 text-red-500">*</span>
                  </div>
                  <FormMessage />
                </FormLabel>
                <FormControl>
                  <Input
                    className="text-base"
                    placeholder="Product Name"
                    {...field}
                  />
                </FormControl>
                <FormDescription>The name of the product</FormDescription>
              </FormItem>
            )}
          />

          {/* Product Brand */}
          <FormField
            control={form.control}
            name="brand"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  <div>
                    <span>Brand</span>
                  </div>
                  <FormMessage>
                    {formState.errors.brand?.id?.message}
                  </FormMessage>
                </FormLabel>
                <Select
                  onValueChange={(value) => {
                    const brand = productBrandsQuery.data?.data.find(
                      (brand) => brand.id.toString() === value,
                    );
                    field.onChange({
                      id: brand?.id.toString() ?? "",
                      name: brand?.attributes.brand ?? "",
                    });
                  }}
                  defaultValue={field.value.id}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          <span className="text-muted-foreground">
                            Select brand
                          </span>
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="No Brand">No Brand</SelectItem>
                    {match(productBrandsQuery)
                      .with(
                        { status: "success" },
                        ({ data: { data: brands } }) => [
                          ...brands.map((brand) => (
                            <SelectItem
                              key={brand.id}
                              value={brand.id.toString()}
                            >
                              {brand.attributes.brand}
                            </SelectItem>
                          )),
                        ],
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
                            Error loading brands
                          </span>
                        ),
                      )
                      .exhaustive()}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Specify which brand the product belongs to.
                </FormDescription>
              </FormItem>
            )}
          />

          {/* Product Default Price */}
          <FormField
            control={form.control}
            name="defaultPrice"
            render={({ field: { onChange, ...field } }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  <div>
                    <span>Default Price ($)</span>
                  </div>
                  <FormMessage />
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    className="text-base"
                    inputMode="decimal"
                    placeholder="Default Price"
                    min={0}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      onChange(value);
                    }}
                    {...field}
                  />
                </FormControl>
                <FormDescription>Default price for the product</FormDescription>
              </FormItem>
            )}
          />

          {/* Product Category */}
          <FormField
            control={form.control}
            name="category"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  <div>
                    <span>Category</span>
                    <span className="ml-1 text-red-500">*</span>
                  </div>
                  <FormMessage>
                    {formState.errors.category?.id?.message}
                  </FormMessage>
                </FormLabel>
                <Select
                  onValueChange={(value) => {
                    const category = productCategoriesQuery.data?.data.find(
                      (category) => category.id.toString() === value,
                    );
                    field.onChange({
                      id: category?.id.toString() ?? "",
                      name: category?.attributes.category ?? "",
                    });
                  }}
                  defaultValue={field.value.id}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          <span className="text-muted-foreground">
                            Select category
                          </span>
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {match(productCategoriesQuery)
                      .with(
                        { status: "success" },
                        ({ data: { data: categories } }) =>
                          categories.map((category) => (
                            <SelectItem
                              key={category.id}
                              value={category.id.toString()}
                            >
                              {category.attributes.category}
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
                            Error loading categories
                          </span>
                        ),
                      )
                      .exhaustive()}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Specify which category the product belongs to.
                </FormDescription>
              </FormItem>
            )}
          />
        </div>
      </Form>
    </div>
  );
};

EditProductPage.getLayout = (page) => {
  return (
    <AuthGuard>
      <MainLayout title="📝 Edit Product">{page}</MainLayout>
    </AuthGuard>
  );
};

export default EditProductPage;
