import { AuthGuard } from "~/lib/contexts/AuthProvider";
import { NextPageWithLayout } from "~/pages/_app";
import MainLayout from "~/components/layouts/MainLayout";
import { api } from "~/utils/api";
import { inferRouterInputs } from "@trpc/server";
import { AppRouter } from "~/server/api/root";
import { useRouter, useSearchParams } from "next/navigation";

type GetCreateCustomerInputs =
  inferRouterInputs<AppRouter>["customer"]["createCustomer"];

const CreateCustomerPage: NextPageWithLayout = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  return <div></div>;
};

CreateCustomerPage.getLayout = (page) => {
  return (
    <AuthGuard>
      <MainLayout title="📝 Create Customer">{page}</MainLayout>
    </AuthGuard>
  );
};

export default CreateCustomerPage;
