import Link from "next/link";
import { useLaunchParams } from "@tma.js/sdk-react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Package,
  ShoppingBag,
  Users,
  PlusCircle,
  ListFilter,
} from "lucide-react";
import { env } from "~/env";

export default function Home() {
  const { startParam } = useLaunchParams();
  const router = useRouter();

  // Use startParam to redirect if it exists, it should be a base64 encoded relative URL e.g. "/orders/1"
  if (startParam) {
    const parsedStartParam = atob(startParam);
    router.replace(`${parsedStartParam}?launch=true`);
    return null;
  }

  const navigationItems = [
    {
      title: "Orders",
      description: "Manage your customer orders",
      icon: <ShoppingBag className="h-6 w-6" />,
      links: [
        {
          label: "View All Orders",
          href: "/orders",
          icon: <ListFilter className="mr-2 h-4 w-4" />,
        },
        {
          label: "Create New Order",
          href: "/orders/create-step1",
          icon: <PlusCircle className="mr-2 h-4 w-4" />,
        },
      ],
      color: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Products",
      description: "Manage your product catalog",
      icon: <Package className="h-6 w-6" />,
      links: [
        {
          label: "View All Products",
          href: "/products",
          icon: <ListFilter className="mr-2 h-4 w-4" />,
        },
        {
          label: "Add New Product",
          href: "/products/create",
          icon: <PlusCircle className="mr-2 h-4 w-4" />,
        },
      ],
      color: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Customers",
      description: "Manage your customer database",
      icon: <Users className="h-6 w-6" />,
      links: [
        {
          label: "View All Customers",
          href: "/customers",
          icon: <ListFilter className="mr-2 h-4 w-4" />,
        },
        {
          label: "Add New Customer",
          href: "/customers/create",
          icon: <PlusCircle className="mr-2 h-4 w-4" />,
        },
      ],
      color: "bg-purple-50 dark:bg-purple-950",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Welcome to 3Elixir
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Order Management System
        </p>

        {startParam && (
          <div className="mt-4 inline-block rounded-md bg-gray-100 px-3 py-1 text-sm text-muted-foreground dark:bg-gray-800">
            <span>Start param: {startParam}</span>
          </div>
        )}
      </div>

      {/* Navigation Cards */}
      {env.NEXT_PUBLIC_FEATURE_NAVIGATION && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {navigationItems.map((item) => (
            <Card
              key={item.title}
              className={`overflow-hidden border-t-4 border-t-primary shadow-md transition-all hover:shadow-lg ${item.color}`}
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="rounded-full bg-primary p-2 text-white">
                  {item.icon}
                </div>
                <div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {item.links.map((link) => (
                    <Button
                      key={link.href}
                      variant="outline"
                      className="w-full justify-start text-left"
                      asChild
                    >
                      <Link href={link.href}>
                        {link.icon}
                        {link.label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
