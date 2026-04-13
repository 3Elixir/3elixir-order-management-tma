import { useBackButton, useInitData, usePopup } from "@tma.js/sdk-react";
import { inferRouterOutputs } from "@trpc/server";
import { Dot, SquareArrowOutUpRight } from "lucide-react";
import { useParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { match } from "ts-pattern";
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
import { Skeleton } from "~/components/ui/skeleton";
import { AuthGuard } from "~/lib/contexts/AuthProvider";
import { NextPageWithLayout } from "~/pages/_app";
import { AppRouter } from "~/server/api/root";
import { api } from "~/utils/api";
import { format } from "date-fns";
import type { MiniAppsEventPayload } from "@tma.js/sdk-react";
import { on as registerTmaEvent, off as unregisterTmaEvent } from "@tma.js/sdk-react";
import { useCustomerForm } from "~/stores/customer-form/useCustomerForm";

type CustomerDetailsOutput =
  inferRouterOutputs<AppRouter>["customer"]["getCustomerDetails"];

const CustomerDetailsPage: NextPageWithLayout = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const tmaBackButton = useBackButton();

  const customerDetailsQuery = api.customer.getCustomerDetails.useQuery(
    {
      customerId: params?.id ?? "",
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
        {match(customerDetailsQuery)
          .with(
            {
              status: "success",
            },
            ({ data: { data: customerDetails } }) => (
              <>
                <CustomerDetailsMain details={customerDetails} />
              </>
            ),
          )
          .with(
            {
              status: "pending",
            },
            () => <CustomerDetailsSkeleton />,
          )
          .with(
            {
              status: "error",
            },
            ({ error }) => (
              <CustomerDetailsError errorMessage={error.message} />
            ),
          )
          .exhaustive()}
      </section>
      {customerDetailsQuery.data && (
        <CustomerDetailsFooter details={customerDetailsQuery.data.data} />
      )}
    </div>
  );
};

const CustomerDetailsMain = ({
  details,
}: {
  details: CustomerDetailsOutput["data"];
}) => {
  const tmaInitData = useInitData();
  const tmaPopup = usePopup();
  const router = useRouter();

  const deleteCustomerMutation = api.customer.deleteCustomer.useMutation();

  const onDeleteCustomer = () => {
    tmaPopup.open({
      title: "Delete Customer",
      message: "Are you sure you want to delete this customer?",
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

    const onConfrimDeleteCustomer = (payload: MiniAppsEventPayload<"popup_closed">) => {
      unregisterTmaEvent("popup_closed", onConfrimDeleteCustomer);

      if (payload.button_id !== "ok") return;
      if (!tmaInitData?.user?.id) return;

      deleteCustomerMutation.mutate(
        {
          customerId: details.id,
        },
        {
          onError: (error) =>
            tmaPopup.open({
              title: "Error",
              message: error.message,
              buttons: [{ type: "ok" }],
            }),
          onSuccess: () => router.push("/customers"),
        },
      );
    };

    registerTmaEvent("popup_closed", onConfrimDeleteCustomer);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-3">
      {/* Customer details card */}
      <Card className="border-dashed">
        <CardHeader className="pb-4">
          <div className="mb-1 flex items-center justify-between">
            <CardTitle className="">Customer #{details.id}</CardTitle>
          </div>
          <CardDescription>
            <div className="flex flex-col">
              <p className="flex items-center">
                <strong className="font-semibold">🕐 Created</strong>
                <Dot className="h-3.5 w-3.5" />
                <span className="font-light">
                  {format(
                    new Date(details.attributes.createdAt),
                    "dd MMM yyyy - h:mm a",
                  )}
                </span>
              </p>
              <p className="flex items-center">
                <strong className="font-semibold">✍️ Last Updated</strong>
                <Dot className="h-3.5 w-3.5" />
                <span className="font-light">
                  {format(
                    new Date(details.attributes.updatedAt),
                    "dd MMM yyyy - h:mm a",
                  )}
                </span>
              </p>
            </div>
          </CardDescription>
        </CardHeader>

        <Separator />

        {/* Customer information */}
        <CardContent className="py-4">
          <div className="flex flex-col space-y-0.5">
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">👤 Customer Name</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">
                {details.attributes.customerName}
              </strong>
            </p>
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">💁 Attention To</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">
                {details.attributes.attentionTo || "N/A"}
              </strong>
            </p>
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">📞 Customer Contact</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">
                {details.attributes.customerContact}
              </strong>
            </p>
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">🏠 Customer Address</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">
                {details.attributes.customerAddress || "No address"}
              </strong>
            </p>
            <p className="flex flex-wrap items-center text-sm">
              <strong className="font-medium">🛒 Default Sales Channel</strong>
              <Dot className="h-3.5 w-3.5" />
              <strong className="font-light">
                {details.attributes.sales_channel.data?.attributes
                  .salesChannel ?? "No sales channel"}
              </strong>
            </p>
          </div>
        </CardContent>

        <Separator />

        <div className="p-2">
          <Button
            variant="ghost"
            type="button"
            className="w-full"
            onClick={() =>
              router.push(`/products?from=customer&customerId=${details.id}`)
            }
          >
            <SquareArrowOutUpRight className="-ml-0.5 mr-1.5 h-5 w-5" />
            Edit Product Prices
          </Button>
        </div>
      </Card>

      <Card className="border-red-300">
        <CardHeader>
          <CardTitle>Delete Customer</CardTitle>
          <CardDescription>
            The customer will be permanently deleted. This action is
            irreversible and cannot be undone.
          </CardDescription>
        </CardHeader>

        <Separator />
        <CardFooter className="justify-end px-3 pb-3 pt-3">
          <Button
            variant="destructive"
            onClick={() => onDeleteCustomer()}
            disabled={deleteCustomerMutation.isPending}
          >
            {deleteCustomerMutation.isPending
              ? "Deleting..."
              : "Delete Customer"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const CustomerDetailsSkeleton = () => {
  return (
    <div className="flex flex-1 flex-col gap-4 p-3">
      <Card className="border-dashed">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center pb-1">
            Customer
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

const CustomerDetailsError = ({ errorMessage }: { errorMessage: string }) => {
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

const CustomerDetailsFooter = ({
  details,
}: {
  details: CustomerDetailsOutput["data"];
}) => {
  const router = useRouter();
  const updateCustomerForm = useCustomerForm(
    (state) => state.updateCustomerForm,
  );

  const onEditCustomer = () => {
    //Set customer form state values via the store to pre-fill the form
    updateCustomerForm({
      customerName: details.attributes.customerName,
      attentionTo: details.attributes.attentionTo ?? "",
      customerContact: details.attributes.customerContact,
      customerAddress: details.attributes.customerAddress,
      salesChannel: {
        id: details.attributes.sales_channel.data?.id.toString() ?? "",
        name: details.attributes.customerName,
      },
    });

    router.push(`/customers/${router.query.id}/edit`);
  };

  return (
    <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-white p-3">
      <Button onClick={() => onEditCustomer()}>Edit</Button>
    </footer>
  );
};

CustomerDetailsPage.getLayout = (page) => {
  return (
    <AuthGuard>
      <MainLayout title="Customer Details">{page}</MainLayout>
    </AuthGuard>
  );
};

export default CustomerDetailsPage;
