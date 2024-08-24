import Link from "next/link";
import { buttonVariants } from "~/components/ui/button";

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
      <Link
        href="/products"
        className={buttonVariants({
          variant: "link",
        })}
      >
        products
      </Link>
      <Link
        href="/customers"
        className={buttonVariants({
          variant: "link",
        })}
      >
        customers
      </Link>
    </main>
  );
}
