import type { AppProps, AppType } from "next/app";
import { ReactElement, ReactNode } from "react";
import { NextPage } from "next";
import dynamic from "next/dynamic";
import { api } from "~/utils/api";
import "~/styles/globals.css";
import { StoresProvider } from "@stores/stores-provider";
import { AuthProvider } from "@lib/contexts/AuthProvider";
import { Toaster } from "react-hot-toast";

const TmaSDKLoader = dynamic(
  () => import("~/components/layouts/TmaSdkLoader").then((mod) => mod.TmaSDKLoader),
  { ssr: false }
);

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

// Initialize eruda (mobile debugger) in development mode when running in browser
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const initEruda = async () => {
    const { default: eruda } = await import("eruda");
    eruda.init();
  };
  initEruda();
}

const MyApp: AppType = ({ Component, pageProps }: AppPropsWithLayout) => {
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <>
      <TmaSDKLoader>
        <AuthProvider>
          <StoresProvider>
            {getLayout(<Component {...pageProps} />)}
          </StoresProvider>
        </AuthProvider>
      </TmaSDKLoader>
      <Toaster />
    </>
  );
};

export default api.withTRPC(MyApp);
