import { useBackButton, useInitData, usePopup } from "@tma.js/sdk-react";
import { on as registerTmaEvent, off as unregisterTmaEvent } from "@tma.js/sdk";
import { useParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect } from "react";
import MainLayout from "~/components/layouts/MainLayout";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import { PopupClosedPayload } from "node_modules/@tma.js/sdk/dist/dts/bridge/events/parsers/popupClosed";
import { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "~/server/api/root";
import { match } from "ts-pattern";
import { Skeleton } from "~/components/ui/skeleton";
import { Dot } from "lucide-react";
import { format } from "date-fns";
import { useProductForm } from "~/stores/product-form/useProductForm";
import { AuthGuard } from "~/lib/contexts/AuthProvider";

const ProductDetailsPage: NextPageWithLayout = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const tmaBackButton = useBackButton();

  const productDetailsQuery = api.product.getProductDetails.useQuery(
    {
      productId: params?.id ?? "",
    },
    {
      enabled: !!params?.id,
    },
  );

  // Show the back button to navigate back to the previous page
  useEffect(() => {
    tmaBackButton.show();
    const onBackButtonPress = () => router.back();
    tmaBackButton.on("click", onBackButtonPress);

    return () => {
      tmaBackButton.off("click", onBackButtonPress);
      tmaBackButton.hide();
    };
  }, []);

  return (
    <div className="flex flex-grow flex-col">
      <section className="h-full flex-1 overflow-y-auto bg-stone-100">
        {match(productDetailsQuery)
          .with(
            {
              status: "success",
            },
            ({ data: { data: productDetails } }) => (
              <>
                <ProductDetailsMain details={productDetails} />
              </>
            ),
          )
          .with(
            {
              status: "pending",
            },
            () => <ProductDetailsSkeleton />,
          )
          .with(
            {
              status: "error",
            },
            ({ error }) => <ProductDetailsError errorMessage={error.message} />,
          )
          .exhaustive()}
      </section>
      {productDetailsQuery.data && (
        <ProductDetailsFooter details={productDetailsQuery.data.data} />
      )}
    </div>
  );
};

const ProductDetailsMain = ({
  details: {
    id: productId,
    attributes: {
      sku,
      name: productName,
      brand: productBrand,
      defaultPrice: productDefaultPrice,
      category: productCategory,
      createdAt,
      updatedAt,
    },
  },
}: {
  details: inferRouterOutputs<AppRouter>["product"]["getProductDetails"]["data"];
}) => {
  const tmaInitData = useInitData();
  const tmaPopup = usePopup();
  const router = useRouter();

  const deleteProductMutation = api.product.deleteProduct.useMutation();

  const onDeleteOrder = () => {
    tmaPopup.open({
      title: "Delete Order",
      message: "Are you sure you want to delete this order?",
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

    const onConfrimDeleteOrder = (payload: PopupClosedPayload) => {
      unregisterTmaEvent("popup_closed", onConfrimDeleteOrder);

      if (payload.button_id !== "ok") return;
      if (!tmaInitData?.user?.id) return;

      deleteProductMutation.mutate(
        {
          productId,
        },
        {
          onError: (error) =>
            tmaPopup.open({
              title: "Error",
              message: error.message,
              buttons: [{ type: "ok" }],
            }),
          onSuccess: () => router.push("/products"),
        },
      );
    };

    registerTmaEvent("popup_closed", onConfrimDeleteOrder);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-3">
      {/* Product details card */}
      <Card className="border-dashed">
        <CardHeader className="pb-4">
          <div className="mb-1 flex items-center justify-between">
            <CardTitle className="">Product #{productId}</CardTitle>
          </div>
          <CardDescription>
            <div className="flex flex-col">
              <p className="flex items-center">
                <strong className="font-semibold">🕐 Created</strong>
                <Dot className="h-3.5 w-3.5" />
                <span className="font-light">
                  {format(new Date(createdAt), "dd MMM yyyy - h:mm a")}
                </span>
              </p>
              <p className="flex items-center">
                <strong className="font-semibold">✍️ Last Updated</strong>
                <Dot className="h-3.5 w-3.5" />
                <span className="font-light">
                  {format(new Date(updatedAt), "dd MMM yyyy - h:mm a")}
                </span>
              </p>
            </div>
          </CardDescription>
        </CardHeader>

        <Separator />

        {/* Product information */}
        <CardContent className="py-4">
          <div className="flex flex-col space-y-0.5">
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">🆔 SKU</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">{sku}</strong>
            </p>
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">🏷️ Product Name</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">{productName}</strong>
            </p>
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">💵 Product Price</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">${productDefaultPrice}</strong>
            </p>
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">🥃 Brand</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">
                {productBrand.data?.attributes.brand ?? "no brand"}
              </strong>
            </p>
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">🗃️ Category</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">
                {productCategory.data?.attributes.category ?? "no category"}
              </strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delete product card */}
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle>Delete Product</CardTitle>
          <CardDescription>
            The product will be permanently deleted. This action is irreversible
            and cannot be undone.
          </CardDescription>
        </CardHeader>

        <Separator />
        <CardFooter className="justify-end px-3 pb-3 pt-3">
          <Button
            variant="destructive"
            onClick={() => onDeleteOrder()}
            disabled={deleteProductMutation.isPending}
          >
            {deleteProductMutation.isPending ? "Deleting..." : "Delete Product"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const ProductDetailsSkeleton = () => {
  return (
    <div className="flex flex-1 flex-col gap-4 p-3">
      <Card className="border-dashed">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center pb-1">
            Product
            <Skeleton className="ml-1.5 h-5 w-10" />
          </CardTitle>
          <CardDescription>
            <div className="flex flex-col">
              <p className="flex items-center">
                <strong className="font-semibold">🕐 Created</strong>
                <Dot className="h-3.5 w-3.5" />
                <Skeleton className="h-4 w-32" />
              </p>
              <p className="flex items-center">
                <strong className="font-semibold">✍️ Last updated</strong>
                <Dot className="h-3.5 w-3.5" />
                <Skeleton className="h-4 w-32" />
              </p>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

const ProductDetailsError = ({ errorMessage }: { errorMessage: string }) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
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

const ProductDetailsFooter = ({
  details,
}: {
  details: inferRouterOutputs<AppRouter>["product"]["getProductDetails"]["data"];
}) => {
  const router = useRouter();
  const updateProductForm = useProductForm((store) => store.updateProductForm);

  const onEditProduct = () => {
    // Set product form state values via the store to pre-fill the form
    updateProductForm({
      sku: details.attributes.sku,
      name: details.attributes.name,
      defaultPrice: details.attributes.defaultPrice ?? undefined,
      brand: {
        id: details.attributes.brand.data?.id.toString() ?? "No Brand",
        name: details.attributes.brand.data?.attributes.brand ?? "No Brand",
      },
      category: {
        id: details.attributes.category.data?.id.toString() ?? "0",
        name:
          details.attributes.category.data?.attributes.category ??
          "no category",
      },
    });

    router.push(`/products/${router.query.id}/edit`);
  };

  return (
    <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-white p-3">
      <Button onClick={() => onEditProduct()}>Edit</Button>
    </footer>
  );
};

ProductDetailsPage.getLayout = (page) => {
  return (
    <AuthGuard>
      <MainLayout title="Product Details">{page}</MainLayout>
    </AuthGuard>
  );
};

export default ProductDetailsPage;
