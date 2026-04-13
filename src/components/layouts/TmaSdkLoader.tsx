import type { PropsWithChildren } from "react";
import { SDKProvider } from "@tma.js/sdk-react";

/**
 * Root component that initializes the Telegram Mini App SDK.
 */
export function TmaSDKLoader({ children }: PropsWithChildren) {
  return (
    <SDKProvider acceptCustomStyles={true} debug={false}>
      {children}
    </SDKProvider>
  );
}
