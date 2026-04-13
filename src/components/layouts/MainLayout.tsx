import { useClosingBehavior, useMiniApp } from "@tma.js/sdk-react";
import { type PropsWithChildren, useEffect } from "react";
import PageHeader from "../PageHeader";
import { usePathname } from "next/navigation";

interface MainLayoutProps extends PropsWithChildren {
  title: string;
}

export default function MainLayout({ title, children }: MainLayoutProps) {
  const miniApp = useMiniApp();
  const tmaClosingBehavior = useClosingBehavior();
  const pathName = usePathname();

  useEffect(() => {
    miniApp.ready();

    // Escape early if pathName is not available
    if (!pathName) return;

    // Enable closing confirmation for /orders/create-step
    if (pathName.startsWith("/orders/create-step")) {
      tmaClosingBehavior.enableConfirmation();
    }

    // Enable closing confirmation for /products/create
    if (pathName.startsWith("/products/create")) {
      tmaClosingBehavior.enableConfirmation();
    }

    return () => {
      tmaClosingBehavior.disableConfirmation();
    };
  }, [miniApp, pathName, tmaClosingBehavior]);

  return (
    <main className="flex h-screen flex-col">
      <PageHeader title={title} />
      {children}
    </main>
  );
}
