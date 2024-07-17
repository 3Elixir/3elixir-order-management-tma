import Link from "next/link";
import { Button, buttonVariants } from "~/components/ui/button";
import { api } from "~/utils/api";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <Link
        href="/orders"
        className={buttonVariants({
          variant: "link",
        })}
      >
        orders
      </Link>
    </main>
  );
}
