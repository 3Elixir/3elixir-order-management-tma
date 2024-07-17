import {
  useBackButton,
  useClosingBehavior,
  useMainButton,
  useThemeParams,
} from "@tma.js/sdk-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { TmaSDKLoader } from "~/components/layouts/TmaSdkLoader";
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

type FilterOptionsType =
  inferRouterOutputs<AppRouter>["product"]["getFilterOptions"];
type PaginationOptionsType =
  inferRouterInputs<AppRouter>["product"]["getFilteredProducts"]["pagination"];

const ProductsPage: NextPageWithLayout = () => {
  const router = useRouter();
  const tmaBackButton = useBackButton();
  const tmaMainButton = useMainButton();
  const tmaThemeParams = useThemeParams();
  const tmaClosingBehavior = useClosingBehavior();
  const searchParams = useSearchParams();
  const isFromOrder = !!searchParams.get("fromOrder");

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

  // Show main button if the page is from order
  useEffect(() => {
    let onButtonClick = () => {};
    if (isFromOrder) {
      tmaMainButton.setParams({
        text: "Finish Adding 🛍️",
        isEnabled: true,
        isLoaderVisible: false,
        backgroundColor: tmaThemeParams.buttonColor,
        textColor: tmaThemeParams.buttonTextColor,
      });
      onButtonClick = () => router.back();
      tmaMainButton.on("click", onButtonClick);
      tmaMainButton.show();
    } else {
      tmaMainButton.hide();
    }

    return () => {
      tmaMainButton.hide();
      tmaMainButton.off("click", onButtonClick);
    };
  }, [isFromOrder]);

  // Enable closing confirmation if the page is from order
  useEffect(() => {
    if (isFromOrder) {
      tmaClosingBehavior.enableConfirmation();
    } else {
      tmaClosingBehavior.disableConfirmation();
    }
  }, [isFromOrder]);

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
          isFromOrder={isFromOrder}
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
                  isFromOrder={isFromOrder}
                  isOnlyAddedProducts={isOnlyAddedProducts}
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
  isFromOrder,
  isOnlyAddedProducts,
}: {
  products: inferRouterOutputs<AppRouter>["product"]["getFilteredProducts"]["data"];
  isFromOrder: boolean;
  isOnlyAddedProducts: boolean;
}) => {
  const { orderProducts } = useOrderForm((state) => ({
    orderProducts: state.orderProducts,
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
        price: 0,
      }));
    }
  }, [products, isOnlyAddedProducts, orderProducts]);

  return (
    <ul className="space-y-2 pb-4">
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
      {parsedProducts.map((product) => (
        <ProductCard
          key={product.productId}
          product={product}
          isFromOrder={isFromOrder}
        />
      ))}
      <div className="flex flex-col gap-1 p-2 pt-4 text-muted-foreground">
        <p className="text-center text-sm font-medium ">End of page</p>
        <p className="text-center text-xs">
          View another page to see more products
        </p>
      </div>
    </ul>
  );
};

const ProductCard = ({
  product,
  isFromOrder,
}: {
  product: z.infer<typeof orderFormSchema>["orderProducts"][0];
  isFromOrder: boolean;
}) => {
  const router = useRouter();

  const { orderProducts, updateOrderForm } = useOrderForm((state) => ({
    orderProducts: state.orderProducts,
    updateOrderForm: state.updateOrderForm,
  }));

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
          price: 10,
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
          <p className="w-64 truncate text-base font-semibold">
            {product.name}
          </p>
          <p className="flex items-center text-sm">
            <span>By</span>
            <Dot className="h-3.5 w-3.5" />
            <span className="font-medium text-indigo-700">{product.brand}</span>
          </p>
        </div>
        {isFromOrder ? (
          isInOrder ? (
            <Button
              size="icon"
              variant="destructive"
              onClick={() => onRemoveFromOrder()}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              onClick={() => onAddToOrder()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )
        ) : (
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              router.push(`/products/${product.productId}`);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
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
  isFromOrder,
  setPagination,
}: {
  filters: FilterOptionsType;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptionsType>>;
  appliedFilters: FilterOptionsType;
  setAppliedFilters: React.Dispatch<React.SetStateAction<FilterOptionsType>>;
  isOnlyAddedProducts: boolean;
  setIsOnlyAddedProducts: React.Dispatch<React.SetStateAction<boolean>>;
  isFromOrder: boolean;
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
          <SheetTitle>Product filters</SheetTitle>
          <SheetDescription>
            Filter products by category and brand
          </SheetDescription>
        </SheetHeader>
        {isFromOrder && (
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
              Apply filters
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
  const isFromOrder = !!useSearchParams().get("fromOrder");
  const title = isFromOrder ? "🛍️ Add Products" : "🍾 View Products";

  return (
    <AuthGuard>
      <MainLayout title={title}>{page}</MainLayout>;
    </AuthGuard>
  );
};

export default ProductsPage;
