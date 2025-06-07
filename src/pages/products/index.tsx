import {
  useBackButton,
  useClosingBehavior,
  useMainButton,
  useThemeParams,
} from "@tma.js/sdk-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { NextPageWithLayout } from "~/pages/_app";
import { api } from "@utils/api";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Dot,
  Hash,
  ListFilter,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import useDebounce from "@lib/hooks/useDebounce";
import { match } from "ts-pattern";
import MainLayout from "~/components/layouts/MainLayout";
import { Skeleton } from "~/components/ui/skeleton";
import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "~/server/api/root";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { useOrderForm } from "@stores/order-form/useOrderForm";
import { Switch } from "~/components/ui/switch";
import { orderFormSchema } from "~/types/order-schema";
import { z } from "zod";
import { AuthGuard } from "~/lib/contexts/AuthProvider";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import toast from "react-hot-toast";
import { productFormSchema } from "~/types/product-schema";

type GetFilteredProductsOutput =
  inferRouterOutputs<AppRouter>["product"]["getFilteredProducts"];

type FilterOptionsType =
  inferRouterOutputs<AppRouter>["product"]["getFilterOptions"];

type PaginationOptionsType =
  inferRouterInputs<AppRouter>["product"]["getFilteredProducts"]["pagination"];

const fromStatusSchema = z.union([z.enum(["order", "customer"]), z.null()]);

const ProductsPage: NextPageWithLayout = () => {
  const router = useRouter();
  const tmaBackButton = useBackButton();
  const tmaMainButton = useMainButton();
  const tmaThemeParams = useThemeParams();
  const tmaClosingBehavior = useClosingBehavior();
  const searchParams = useSearchParams();
  const fromStatus = fromStatusSchema.safeParse(searchParams.get("from")).data;

  const scrollRef = React.useRef<HTMLDivElement>(null);

  const {
    debouncedValue: debounchedSearch,
    liveValue: liveSearch,
    setLiveValue: setLiveSearch,
  } = useDebounce({
    initialValue: "",
    delay: 250,
    onDebouncedChange: () => {
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
  });

  const [pagination, setPagination] = useState<PaginationOptionsType>({
    page: 1,
    pageSize: 10,
  });
  const [filters, setFilters] = useState<FilterOptionsType>({
    categories: [],
    brands: [],
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterOptionsType>({
    categories: [],
    brands: [],
  });
  const [isOnlyAddedProducts, setIsOnlyAddedProducts] = useState(false);

  const productQuery = api.product.getFilteredProducts.useQuery({
    search: debounchedSearch.trim(),
    filters: appliedFilters,
    pagination: pagination,
  });

  // Scroll to top when product query changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "instant", block: "end" });
    }
  }, [pagination?.page]);

  // Hide back button on mount
  useEffect(() => {
    tmaBackButton.hide();
  }, []);

  // Show main button based on fromStatus
  useEffect(() => {
    let onButtonClick = () => {};

    match(fromStatus)
      .with("order", () => {
        tmaMainButton.setParams({
          text: "Finish adding products 🛍️",
          isEnabled: true,
          isLoaderVisible: false,
          backgroundColor: tmaThemeParams.buttonColor,
          textColor: tmaThemeParams.buttonTextColor,
        });
        onButtonClick = () => router.back();
        tmaMainButton.on("click", onButtonClick);
        tmaMainButton.show();
      })
      .with("customer", () => {
        tmaMainButton.setParams({
          text: "Finish editing prices 🏷️",
          isEnabled: true,
          isLoaderVisible: false,
          backgroundColor: tmaThemeParams.buttonColor,
          textColor: tmaThemeParams.buttonTextColor,
        });
        onButtonClick = () => router.back();
        tmaMainButton.on("click", onButtonClick);
        tmaMainButton.show();
      })
      .otherwise(() => tmaBackButton.hide());

    return () => {
      tmaMainButton.hide();
      tmaMainButton.off("click", onButtonClick);
    };
  }, [fromStatus]);

  // Enable closing confirmation based on fromStatus
  useEffect(() => {
    if (fromStatus === "order" || fromStatus === "customer") {
      tmaClosingBehavior.enableConfirmation();
    } else {
      tmaClosingBehavior.disableConfirmation();
    }
  }, [fromStatus]);

  return (
    <div className="flex flex-grow flex-col">
      <div className="sticky top-0 z-50 flex gap-2 bg-white p-4 py-3 shadow">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full rounded-lg bg-background pl-8"
            value={liveSearch}
            onChange={(e) => setLiveSearch(e.target.value)}
          />
        </div>
        <ProductsQueryFilterSheet
          filters={filters}
          setFilters={setFilters}
          appliedFilters={appliedFilters}
          setAppliedFilters={setAppliedFilters}
          isOnlyAddedProducts={isOnlyAddedProducts}
          setIsOnlyAddedProducts={setIsOnlyAddedProducts}
          fromStatus={fromStatus}
          setPagination={setPagination}
        />
      </div>

      <section className="h-full overflow-y-auto bg-stone-100 px-3 pt-3">
        <div ref={scrollRef} />
        {match(productQuery)
          .with(
            { status: "success" },
            ({ data: { data: filteredProducts } }) =>
              filteredProducts.length > 0 ? (
                <ProductsQueryList
                  products={filteredProducts}
                  isOnlyAddedProducts={isOnlyAddedProducts}
                  fromStatus={fromStatus}
                />
              ) : (
                <ProductsQueryEmpty />
              ),
          )
          .with({ status: "pending" }, () => <ProductsQuerySkeleton />)
          .with({ status: "error" }, ({ error }) => (
            <ProductsQueryError errorMessage={error.message} />
          ))
          .exhaustive()}
      </section>
      {!isOnlyAddedProducts && (
        <ProductsQueryFooter
          pagination={productQuery.data?.meta.pagination}
          isProductQueryLoading={productQuery.isLoading}
          setPagination={setPagination}
        />
      )}
    </div>
  );
};

const ProductsQuerySkeleton = () => {
  return (
    <ul className="flex h-full flex-col items-center space-y-2">
      {Array.from({ length: 10 }).map((_, index) => (
        <li
          key={index}
          className="flex w-full flex-col gap-1 rounded border bg-white shadow-sm"
        >
          <div className="flex w-full justify-between px-3 py-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Separator />
          <div className="px-3 pb-2 pt-1">
            <Skeleton className="h-12 w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
};

const ProductsQueryError = ({ errorMessage }: { errorMessage: string }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
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

const ProductsQueryEmpty = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <span className="text-5xl">🤷‍♂️</span>
      <p className="mt-2 text-center text-lg font-semibold text-amber-600">
        Nothing found
      </p>
      <span className="mt-2 text-center text-sm text-gray-500">
        Try searching for something else or adjust your filters
      </span>
    </div>
  );
};

const ProductsQueryList = ({
  products,
  isOnlyAddedProducts,
  fromStatus,
}: {
  products: inferRouterOutputs<AppRouter>["product"]["getFilteredProducts"]["data"];
  isOnlyAddedProducts: boolean;
  fromStatus?: z.infer<typeof fromStatusSchema>;
}) => {
  const { orderProducts, customerId, customerName } = useOrderForm((state) => ({
    orderProducts: state.orderProducts,
    customerId: state.customerId,
    customerName: state.customerName,
  }));

  const parsedProducts = useMemo(() => {
    if (isOnlyAddedProducts) {
      return orderProducts;
    } else {
      return products.map((product) => ({
        productId: product.id,
        name: product.attributes.name,
        sku: product.attributes.sku,
        category:
          product.attributes.category.data?.attributes.category ??
          "Uncategorized",
        brand: product.attributes.brand.data?.attributes.brand ?? "No Brand",
        quantity: 0,
        price: product.attributes.defaultPrice ?? 0,
      }));
    }
  }, [products, isOnlyAddedProducts, orderProducts]);

  return (
    <ul className="space-y-2 pb-4">
      {/* Render when viewing products from order creation with customer selected */}
      {customerId && (
        <p className="ml-1 text-sm text-gray-500">
          Showing{" "}
          <span className="font-medium text-primary">{customerName}'s</span>{" "}
          product prices
        </p>
      )}

      {/* Render when viewing products from order creation */}
      {isOnlyAddedProducts && parsedProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8">
          <span className="text-5xl">🤷‍♂️</span>
          <p className="mt-2 text-center text-lg font-semibold text-amber-600">
            No products added
          </p>
          <span className="mt-2 text-center text-sm text-gray-500">
            Add products to the order by clicking the "+" button on the product
          </span>
        </div>
      )}
      {match(fromStatus)
        .with("order", () =>
          parsedProducts.map((product) => (
            <ProductCardOrder key={product.productId} product={product} />
          )),
        )
        .with("customer", () =>
          parsedProducts.map((product) => (
            <ProductCardCustomer key={product.productId} product={product} />
          )),
        )
        .otherwise(() =>
          products.map((product) => (
            <ProductCardDefault key={product.id} product={product} />
          )),
        )}
      <div className="flex flex-col gap-1 p-2 pt-4 text-muted-foreground">
        <p className="text-center text-sm font-medium ">End of page</p>
        <p className="text-center text-xs">
          View another page to see more products
        </p>
      </div>
    </ul>
  );
};

const productPricingFormDefaultSchema = z.object({
  id: z.number(),
  defaultPrice: z.string(),
});

const ProductCardDefault = ({
  product,
}: {
  product: GetFilteredProductsOutput["data"][0];
}) => {
  const router = useRouter();
  const queryContext = api.useUtils();

  const form = useForm<z.infer<typeof productPricingFormDefaultSchema>>({
    resolver: zodResolver(productPricingFormDefaultSchema),
    defaultValues: {
      id: product.id,
      defaultPrice:
        product.attributes.defaultPrice === null
          ? ""
          : product.attributes.defaultPrice.toString(),
    },
  });

  const updateProductDefaultPriceMutation =
    api.product.updateProductDefaultPrice.useMutation({
      onSuccess: ({ data }) => {
        toast.success(
          data.attributes.defaultPrice !== null
            ? `Set price to $${data.attributes.defaultPrice.toFixed(2)}`
            : "Removed price",
          {
            position: "top-right",
          },
        );
        queryContext.product.getFilteredProducts.invalidate();
        form.reset({
          id: data.id,
          defaultPrice:
            data.attributes.defaultPrice !== null
              ? data.attributes.defaultPrice.toString()
              : "",
        });
      },
    });

  const onSubmit: SubmitHandler<
    z.infer<typeof productPricingFormDefaultSchema>
  > = (data) => {
    const priceInFloat = parseFloat(data.defaultPrice);
    updateProductDefaultPriceMutation.mutate({
      productId: product.id,
      defaultPrice: isNaN(priceInFloat) ? undefined : priceInFloat,
    });
  };

  const onError: SubmitErrorHandler<
    z.infer<typeof productPricingFormDefaultSchema>
  > = (error) => {
    console.error(error);
  };

  return (
    <li
      key={product.id}
      className="flex flex-col rounded border bg-white shadow-sm"
    >
      <div className="flex w-full justify-between px-3 py-2 text-sm">
        <span className="flex items-center font-medium text-gray-600">
          <Hash className="h-3 w-3" />
          {product.attributes.sku}
        </span>
        <Badge>
          {product.attributes.category.data?.attributes.category ??
            "No category"}
        </Badge>
      </div>
      <Separator />
      <div className="mt-1 flex w-full items-center px-3 pb-2 pt-1 text-sm">
        <div className="flex-grow">
          <p className="w-72 truncate text-base font-semibold">
            {product.attributes.name}
          </p>

          <div className="flex items-center">
            <span>By</span>
            <Dot className="h-3.5 w-3.5" />
            <p className="flex items-center text-sm">
              <span className="font-medium text-indigo-700">
                {product.attributes.brand.data?.attributes.brand ?? "No brand"}
              </span>
            </p>
            <Dot className="h-3.5 w-3.5" />
            <div className="mt-0.5 flex items-center text-sm">
              <Sheet
                onOpenChange={(open) => {
                  open && form.reset();
                }}
              >
                {updateProductDefaultPriceMutation.isPending ? (
                  <Skeleton className="h-5 w-16" />
                ) : (
                  <SheetTrigger
                    disabled={updateProductDefaultPriceMutation.isPending}
                  >
                    {
                      <Badge variant={"outline"} className="shadow">
                        {product.attributes.defaultPrice === null
                          ? "Set price"
                          : `$${product.attributes.defaultPrice.toFixed(2)}`}
                      </Badge>
                    }
                  </SheetTrigger>
                )}

                <SheetContent side="top">
                  <SheetHeader>
                    <SheetTitle>Product Default Pricing</SheetTitle>
                    <SheetDescription>
                      Set a default price for this product that will
                      automatically apply to orders
                    </SheetDescription>
                  </SheetHeader>
                  {/* Product preview */}
                  <div className="mt-4 flex flex-col rounded border bg-white shadow">
                    <div className="flex w-full justify-between px-3 py-2 text-sm">
                      <span className="flex items-center font-medium text-gray-600">
                        <Hash className="h-3 w-3" />
                        {product.attributes.sku}
                      </span>
                      <Badge>
                        {product.attributes.category.data?.attributes
                          .category ?? "No category"}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="mt-1 flex w-full items-center px-3 pb-2 pt-1 text-sm">
                      <div className="flex-grow">
                        <p className="w-72 truncate text-base font-semibold">
                          {product.attributes.name}
                        </p>
                        <p className="flex items-center text-sm">
                          <span>By</span>
                          <Dot className="h-3.5 w-3.5" />
                          <span className="font-medium text-indigo-700">
                            {product.attributes.brand.data?.attributes.brand ??
                              "No brand"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <Form {...form}>
                    <div className="grid gap-4 py-4">
                      <FormField
                        control={form.control}
                        name="defaultPrice"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <FormLabel className="text-right">
                                Price ($)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="col-span-3"
                                  type="number"
                                  inputMode="decimal"
                                  placeholder="Enter a price"
                                  min={0}
                                  {...field}
                                />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </Form>
                  <SheetFooter>
                    <SheetClose asChild>
                      <Button
                        onClick={() => {
                          form.handleSubmit(onSubmit, () => onError)();
                        }}
                      >
                        Save price
                      </Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        <Button
          size="icon"
          variant="outline"
          onClick={() => {
            router.push(`/products/${product.id}`);
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
};

const ProductCardOrder = ({
  product,
}: {
  product: z.infer<typeof orderFormSchema>["orderProducts"][0];
}) => {
  const { customerId, orderProducts, updateOrderForm } = useOrderForm(
    (state) => ({
      customerId: state.customerId,
      orderProducts: state.orderProducts,
      updateOrderForm: state.updateOrderForm,
    }),
  );

  const customerProductPriceQuery = api.customerProduct.getPricing.useQuery(
    {
      customerId: customerId ?? 0,
      productId: product.productId,
    },
    {
      enabled: !!customerId,
    },
  );

  const onAddToOrder = () => {
    updateOrderForm({
      orderProducts: [
        ...orderProducts,
        {
          productId: product.productId,
          brand: product.brand,
          category: product.category,
          name: product.name,
          sku: product.sku,
          price:
            customerProductPriceQuery.data?.attributes.price ?? product.price,
          quantity: 1,
        },
      ],
    });
  };

  const onRemoveFromOrder = () => {
    updateOrderForm({
      orderProducts: orderProducts.filter(
        (orderProduct) => orderProduct.productId !== product.productId,
      ),
    });
  };

  const isInOrder = orderProducts.some(
    (orderProduct) => orderProduct.productId === product.productId,
  );

  return (
    <li
      key={product.productId}
      className="flex flex-col rounded border bg-white shadow-sm"
    >
      <div className="flex w-full justify-between px-3 py-2 text-sm">
        <span className="flex items-center font-medium text-gray-600">
          <Hash className="h-3 w-3" />
          {product.sku}
        </span>
        <Badge>{product.category}</Badge>
      </div>
      <Separator />
      <div className="mt-1 flex w-full items-center px-3 pb-2 pt-1 text-sm">
        <div className="flex-grow">
          <p className="w-72 truncate text-base font-semibold">
            {product.name}
          </p>

          <div className="flex items-center">
            <p className="flex items-center text-sm">
              <span>By</span>
              <Dot className="h-3.5 w-3.5" />
              <span className="font-medium text-indigo-700">
                {product.brand}
              </span>
            </p>
            <Dot className="h-3.5 w-3.5" />

            {/* Render pricing based on customer selected */}
            {customerId &&
              match(customerProductPriceQuery)
                .with({ status: "success" }, ({ data }) => (
                  <Badge
                    variant={data?.attributes.price ? "outline" : "secondary"}
                  >
                    {data?.attributes.price
                      ? `$${data.attributes.price.toFixed(2)}`
                      : `$${product.price}`}
                  </Badge>
                ))
                .with({ status: "pending" }, () => (
                  <Skeleton className="h-5 w-16" />
                ))
                .with({ status: "error" }, () => <>Error fetching price</>)
                .exhaustive()}

            {/* Render default prices */}
            {!customerId && <Badge variant={"outline"}>${product.price}</Badge>}
          </div>
        </div>

        {/* Render button based on whether product has been added to order */}
        {isInOrder ? (
          <Button
            size="icon"
            variant="destructive"
            onClick={() => onRemoveFromOrder()}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            disabled={customerProductPriceQuery.isLoading}
            size="icon"
            variant="outline"
            onClick={() => onAddToOrder()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  );
};

const productPricingFormSchema = z.object({
  id: z.number().optional(),
  price: z.string(),
});
const ProductCardCustomer = ({
  product,
}: {
  product: z.infer<typeof orderFormSchema>["orderProducts"][0];
}) => {
  const tmaMainButton = useMainButton();
  const searchParams = useSearchParams();
  const queryContext = api.useUtils();

  const customerProductPriceQuery = api.customerProduct.getPricing.useQuery({
    customerId: parseInt(searchParams.get("customerId") ?? "0"),
    productId: product.productId,
  });
  const customerProductUpdatePriceMutation =
    api.customerProduct.updatePricing.useMutation({
      onSuccess: ({ data }) => {
        toast.success(
          data.attributes.price
            ? `Set price to $${data.attributes.price.toFixed(2)}`
            : "Removed price",
          {
            position: "top-right",
          },
        );
        queryContext.customerProduct.getPricing.invalidate({
          customerId: parseInt(searchParams.get("customerId") ?? "0"),
          productId: product.productId,
        });
        form.reset({
          id: data.id,
          price: data?.attributes.price ? data.attributes.price.toString() : "",
        });
      },
    });
  const customerProductCreatePriceMutation =
    api.customerProduct.createPricing.useMutation({
      onSuccess: ({ data }) => {
        toast.success(
          data.attributes.price
            ? `Set price to $${data.attributes.price.toFixed(2)}`
            : "Removed price",
          {
            position: "top-right",
          },
        );
        queryContext.customerProduct.getPricing.invalidate({
          customerId: parseInt(searchParams.get("customerId") ?? "0"),
          productId: product.productId,
        });
        form.reset({
          id: data.id,
          price: data?.attributes.price ? data.attributes.price.toString() : "",
        });
      },
    });

  const form = useForm<z.infer<typeof productPricingFormSchema>>({
    resolver: zodResolver(productPricingFormSchema),
    defaultValues: async () => {
      const data = await queryContext.customerProduct.getPricing.ensureData({
        customerId: parseInt(searchParams.get("customerId") ?? "0"),
        productId: product.productId,
      });
      return {
        id: data?.id,
        price: data?.attributes.price ? data.attributes.price.toString() : "",
      };
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof productPricingFormSchema>> = (
    data,
  ) => {
    const priceInFloat = parseFloat(data.price);

    if (!data.id) {
      // Create customer product entry
      customerProductCreatePriceMutation.mutate({
        customerId: parseInt(searchParams.get("customerId") ?? "0"),
        productId: product.productId,
        price: isNaN(priceInFloat) ? null : priceInFloat,
      });
    } else {
      // Update customer product entry
      customerProductUpdatePriceMutation.mutate({
        id: data.id,
        price: isNaN(priceInFloat) ? null : priceInFloat,
      });
    }
  };

  const onError: SubmitErrorHandler<
    z.infer<typeof productPricingFormSchema>
  > = (error) => {
    console.error(error);
  };

  return (
    <li
      key={product.productId}
      className="flex flex-col rounded border bg-white shadow-sm"
    >
      <div className="flex w-full justify-between px-3 py-2 text-sm">
        <span className="flex items-center font-medium text-gray-600">
          <Hash className="h-3 w-3" />
          {product.sku}
        </span>
        <Badge>{product.category}</Badge>
      </div>
      <Separator />
      <div className="mt-1 flex w-full items-center px-3 pb-2 pt-1 text-sm">
        <div className="flex-grow">
          <p className="w-72 truncate text-base font-semibold">
            {product.name}
          </p>

          <div className="flex items-center">
            <span>By</span>
            <Dot className="h-3.5 w-3.5" />
            <p className="flex items-center text-sm">
              <span className="font-medium text-indigo-700">
                {product.brand}
              </span>
            </p>
            <Dot className="h-3.5 w-3.5" />
            <div className="mt-0.5 flex items-center text-sm">
              {/* Render price editing sheet based on query */}
              {match(customerProductPriceQuery)
                .with({ status: "success" }, ({ data }) => (
                  <Sheet
                    onOpenChange={(open) => {
                      open ? tmaMainButton.hide() : tmaMainButton.show();
                      open && form.reset();
                    }}
                  >
                    <SheetTrigger
                      disabled={
                        customerProductUpdatePriceMutation.isPending ||
                        customerProductCreatePriceMutation.isPending ||
                        customerProductPriceQuery.isFetching
                      }
                    >
                      {customerProductCreatePriceMutation.isPending ||
                      customerProductUpdatePriceMutation.isPending ||
                      customerProductPriceQuery.isFetching ? (
                        <Skeleton className="h-5 w-16" />
                      ) : (
                        <Badge
                          variant={"outline"}
                          className={cn(!data?.attributes.price && "shadow")}
                        >
                          {data?.attributes.price
                            ? `$${data.attributes.price.toFixed(2)}`
                            : "Set price"}
                        </Badge>
                      )}
                    </SheetTrigger>

                    <SheetContent side="top">
                      <SheetHeader>
                        <SheetTitle>Customer Product Pricing</SheetTitle>
                        <SheetDescription>
                          Set a default price for this product that will
                          automatically apply to this customer’s orders
                        </SheetDescription>
                      </SheetHeader>
                      {/* Product preview */}
                      <div className="mt-4 flex flex-col rounded border bg-white shadow">
                        <div className="flex w-full justify-between px-3 py-2 text-sm">
                          <span className="flex items-center font-medium text-gray-600">
                            <Hash className="h-3 w-3" />
                            {product.sku}
                          </span>
                          <Badge>{product.category}</Badge>
                        </div>
                        <Separator />
                        <div className="mt-1 flex w-full items-center px-3 pb-2 pt-1 text-sm">
                          <div className="flex-grow">
                            <p className="w-72 truncate text-base font-semibold">
                              {product.name}
                            </p>
                            <p className="flex items-center text-sm">
                              <span>By</span>
                              <Dot className="h-3.5 w-3.5" />
                              <span className="font-medium text-indigo-700">
                                {product.brand}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <Form {...form}>
                        <div className="grid gap-4 py-4">
                          <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <FormLabel
                                    htmlFor="product-price"
                                    className="text-right"
                                  >
                                    Price ($)
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      className="col-span-3"
                                      type="number"
                                      inputMode="decimal"
                                      placeholder="Enter a price"
                                      min={0}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </Form>
                      <SheetFooter>
                        <SheetClose asChild>
                          <Button
                            onClick={() => {
                              form.handleSubmit(onSubmit, () => onError)();
                            }}
                          >
                            Save price
                          </Button>
                        </SheetClose>
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>
                ))
                .with({ status: "pending" }, () => (
                  <Skeleton className="h-5 w-16" />
                ))
                .with({ status: "error" }, () => <>Failed to fetch price</>)
                .exhaustive()}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

const ProductsQueryFilterSheet = ({
  filters,
  setFilters,
  appliedFilters,
  setAppliedFilters,
  isOnlyAddedProducts,
  setIsOnlyAddedProducts,
  fromStatus,
  setPagination,
}: {
  filters: FilterOptionsType;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptionsType>>;
  appliedFilters: FilterOptionsType;
  setAppliedFilters: React.Dispatch<React.SetStateAction<FilterOptionsType>>;
  isOnlyAddedProducts: boolean;
  setIsOnlyAddedProducts: React.Dispatch<React.SetStateAction<boolean>>;
  fromStatus?: z.infer<typeof fromStatusSchema>;
  setPagination: React.Dispatch<React.SetStateAction<PaginationOptionsType>>;
}) => {
  const filterOptionsQuery = api.product.getFilterOptions.useQuery();
  const hasFiltersApplied = Object.values(appliedFilters).some(
    (filter) => filter.length > 0,
  );

  const onClearFilters = () => {
    setFilters({ categories: [], brands: [] });
    setAppliedFilters({ categories: [], brands: [] });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn("relative w-9", hasFiltersApplied && "shadow-md")}
        >
          <ListFilter className="h-4 w-4" />
          {hasFiltersApplied && (
            <div className="absolute right-0 top-0 -mr-2 -mt-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white shadow-md">
              {Object.values(appliedFilters).filter((f) => f.length > 0).length}
            </div>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-[325px] flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Product Filters</SheetTitle>
          <SheetDescription>
            Filter products by category and brand
          </SheetDescription>
        </SheetHeader>
        {fromStatus === "order" && (
          <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label>Added products</Label>
              <p className="text-[0.8rem] text-muted-foreground">
                Show only products that were added to the order
              </p>
            </div>
            <Switch
              checked={isOnlyAddedProducts}
              onCheckedChange={setIsOnlyAddedProducts}
            />
          </div>
        )}
        {match(filterOptionsQuery)
          .with({ status: "success" }, ({ data }) => (
            <div className="flex flex-grow flex-col gap-3">
              <div>
                <div className="flex h-6 items-center justify-between">
                  <Label>Category</Label>
                  {filters.categories.length > 0 && (
                    <Badge
                      variant="outline"
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, categories: [] }))
                      }
                    >
                      Clear
                    </Badge>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {data.categories.map((category) => (
                    <FilterToggleButton
                      key={category}
                      value={category}
                      selected={filters.categories.includes(category)}
                      onToggle={() =>
                        setFilters((prev) => ({
                          ...prev,
                          categories: prev.categories.includes(category)
                            ? prev.categories.filter((c) => c !== category)
                            : [...prev.categories, category],
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <div className="flex h-6 items-center justify-between">
                  <Label>Brand</Label>
                  {filters.brands.length > 0 && (
                    <Badge
                      variant="outline"
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, brands: [] }))
                      }
                    >
                      Clear
                    </Badge>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {data.brands.map((brand) => (
                    <FilterToggleButton
                      key={brand}
                      value={brand}
                      selected={filters.brands.includes(brand)}
                      onToggle={() =>
                        setFilters((prev) => ({
                          ...prev,
                          brands: prev.brands.includes(brand)
                            ? prev.brands.filter((b) => b !== brand)
                            : [...prev.brands, brand],
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          ))
          .with({ status: "pending" }, () => (
            <div> Loading filter options...</div>
          ))
          .with({ status: "error" }, ({ error }) => (
            <div> Error loading filter options: {error.message}</div>
          ))
          .exhaustive()}
        <SheetFooter className="sticky bottom-0 mt-auto flex flex-row gap-2 rounded border bg-gray-200 bg-opacity-70 bg-clip-padding p-2 shadow-md backdrop-blur-md backdrop-filter">
          <SheetClose asChild>
            <Button
              className="flex-1"
              onClick={() => {
                setAppliedFilters(filters);
                setPagination({
                  page: 1,
                  pageSize: 10,
                });
              }}
              disabled={
                JSON.stringify(filters) === JSON.stringify(appliedFilters)
              }
            >
              Apply Filters
            </Button>
          </SheetClose>

          {hasFiltersApplied && (
            <SheetClose asChild>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => onClearFilters()}
              >
                Clear filters
              </Button>
            </SheetClose>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

const FilterToggleButton = ({
  value,
  selected,
  onToggle,
}: {
  value: string;
  selected: boolean;
  onToggle: () => void;
}) => {
  return (
    <Button
      size="sm"
      variant={selected ? "default" : "outline"}
      className={cn("rounded-none", selected && "ring-1 ring-offset-1")}
      onClick={() => onToggle()}
    >
      <span className="truncate">{value}</span>
    </Button>
  );
};

// Pagination for the products list
const ProductsQueryFooter = ({
  pagination,
  setPagination,
  isProductQueryLoading,
}: {
  isProductQueryLoading: boolean;
  pagination?: inferRouterOutputs<AppRouter>["product"]["getFilteredProducts"]["meta"]["pagination"];
  setPagination: React.Dispatch<React.SetStateAction<PaginationOptionsType>>;
}) => {
  const currentPage = pagination?.page ?? 0;
  const totalProducts = pagination?.total ?? 0;
  const pageSize = pagination?.pageSize ?? 0;

  const currentPageStart = (currentPage - 1) * pageSize + 1;
  const currentPageEnd = Math.min(currentPage * pageSize, totalProducts);

  const onPreviousPage = () => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, (prev?.page ?? 0) - 1),
    }));
  };

  const onNextPage = () => {
    setPagination((prev) => ({
      ...prev,
      page: Math.min(
        Math.ceil(totalProducts / (prev?.pageSize ?? 0)),
        (prev?.page ?? 0) + 1,
      ),
    }));
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 flex items-center justify-between border-t bg-white p-3">
      <Button
        size="sm"
        variant="outline"
        onClick={() => onPreviousPage()}
        disabled={currentPage === 1 || isProductQueryLoading}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      {isProductQueryLoading ? (
        <p className="text-center text-sm text-muted-foreground">Loading...</p>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Showing <span className="font-semibold">{currentPageStart}</span>
          <span> - </span>
          <span className="font-semibold">{currentPageEnd}</span> of{" "}
          <span className="font-semibold">{totalProducts}</span> products
        </p>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onNextPage()}
        disabled={
          currentPage === Math.ceil(totalProducts / pageSize) ||
          isProductQueryLoading ||
          totalProducts === 0
        }
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

ProductsPage.getLayout = (page) => {
  const searchParams = useSearchParams();
  const fromStatus = fromStatusSchema.safeParse(searchParams.get("from")).data;
  const title = match(fromStatus)
    .with("order", () => "🛍️ Add Products")
    .with("customer", () => "🏷️ Edit Prices")
    .otherwise(() => "🍾 View Products");

  return (
    <AuthGuard>
      <MainLayout title={title}>{page}</MainLayout>;
    </AuthGuard>
  );
};

export default ProductsPage;
