import { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "../../root";
import { escapeSpecialChars } from "~/lib/utils";

type GetOrderDetailsOutput =
  inferRouterOutputs<AppRouter>["order"]["getOrderDetails"]["data"]["attributes"];
type UpdateOrderDetailsOutput =
  inferRouterOutputs<AppRouter>["order"]["updateOrderDetails"]["data"]["data"]["attributes"];

type OrderDifference = {
  oldValue: string | null;
  newValue: string | null;
} | null;

type GetOrderDifferenceOutput = Record<
  keyof GetOrderDetailsOutput,
  OrderDifference
>;

const LABEL_MAP: Record<keyof GetOrderDetailsOutput, string> = {
  attentionTo: "Attention To",
  customerAddress: "Customer Address",
  customerContact: "Customer Contact",
  customerName: "Customer Name",
  deliveryFee: "Delivery Fee",
  excludeGst: "Exclude GST",
  fulfilmentEnd: "Fulfilment End",
  fulfilmentStart: "Fulfilment Start",
  orderProducts: "Order Products",
  order_status: "Order Status",
  payment_method: "Payment Method",
  payment_status: "Payment Status",
  remarks: "Remarks",
  sales_agents: "Sales Agents",
  sales_channel: "Sales Channel",
  updatedAt: "Updated At",
  telegramMessage: "Telegram Message",
  createdAt: "Created At",
  publishedAt: "Published At",
  orderId: "Order ID",
  orderCollectionDateTime: "Order Collection Date Time",
  customer: "Customer Details",
  fulfilment_method: "Fulfilment Method",
};

const typedObjectKeys = <T extends Record<string, unknown>>(
  obj: T,
): Array<keyof T> => Object.keys(obj) as Array<keyof T>;

const safeStringify = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  return String(value).trim();
};

const toCamelCase = (snakeCase: string): string => {
  const parts = snakeCase.split("_");
  return (
    parts[0] +
    parts
      .slice(1)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("")
  );
};

const hasNestedData = (
  obj: unknown,
): obj is { data: { attributes: Record<string, unknown> } } => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "data" in obj &&
    typeof obj.data === "object" &&
    obj.data !== null &&
    "attributes" in obj.data
  );
};

const compareSimpleValues = (
  prev: unknown,
  current: unknown,
): OrderDifference => {
  // Handle null/undefined values
  const prevIsNull = prev === null || prev === undefined;
  const currentIsNull = current === null || current === undefined;

  // If one is null/undefined and other isn't, or if they're different non-object values
  if (
    prevIsNull !== currentIsNull ||
    (typeof prev !== "object" &&
      typeof current !== "object" &&
      prev !== current)
  ) {
    return {
      oldValue: safeStringify(prev),
      newValue: safeStringify(current),
    };
  }
  return null;
};

const compareNestedObjects = (
  prev: unknown,
  current: unknown,
  key: string,
): OrderDifference => {
  if (typeof prev !== "object" || typeof current !== "object") return null;
  if (JSON.stringify(prev) === JSON.stringify(current)) return null;

  if (!hasNestedData(prev) || !hasNestedData(current)) return null;

  const attributeKey = toCamelCase(key);
  const prevValue = prev.data.attributes[attributeKey] as string;
  const currentValue = current.data.attributes[attributeKey] as string;

  if (prevValue !== currentValue) {
    return {
      oldValue: safeStringify(prevValue),
      newValue: safeStringify(currentValue),
    };
  }

  return null;
};

const getOrderDifferences = (
  prevData: GetOrderDetailsOutput,
  currentData: UpdateOrderDetailsOutput,
  excludedKeys: Array<keyof GetOrderDetailsOutput> = [],
): GetOrderDifferenceOutput => {
  // Initialize all keys with null
  const initialDifferences = Object.fromEntries(
    typedObjectKeys(prevData).map((key) => [key, null]),
  ) as GetOrderDifferenceOutput;

  // Process and update only the keys that have differences
  return typedObjectKeys(prevData)
    .filter((key) => !excludedKeys.includes(key) && key !== "orderProducts")
    .reduce((acc, key) => {
      const prevValue = prevData[key];
      const currentValue = currentData[key];

      const difference =
        compareSimpleValues(prevValue, currentValue) ||
        compareNestedObjects(prevValue, currentValue, key);

      if (difference) {
        acc[key] = difference;
      }

      return acc;
    }, initialDifferences);
};

const getOrderDifferenceMessage = (differences: GetOrderDifferenceOutput) => {
  return Object.entries(differences)
    .map(([key, value]) => {
      if (value === null) return null; // Skip null values
      if (key === "fulfilmentStart" || key === "fulfilmentEnd") {
        const oldValue = value.oldValue
          ? `⏳ Old: ${new Date(value.oldValue).toLocaleString("en-SG", {
              dateStyle: "short",
              timeStyle: "short",
            })}`
          : "⏳ Old: N/A";
        const newValue = value.newValue
          ? `⭐ New: ${new Date(value.newValue).toLocaleString("en-SG", {
              dateStyle: "short",
              timeStyle: "short",
            })}`
          : "⭐ New: N/A";
        return `*🔄 ${escapeSpecialChars(LABEL_MAP[key as keyof typeof LABEL_MAP])}*\n> ${oldValue}\n> ${newValue}`;
      }
      if (key === "excludeGst") {
        const oldValue = value.oldValue === "true" ? "Yes" : "No";
        const newValue = value.newValue === "true" ? "Yes" : "No";
        return `*🔄 ${escapeSpecialChars(LABEL_MAP[key as keyof typeof LABEL_MAP])}*\n> ⏳ Old: ${oldValue}\n> ⭐ New: ${newValue}`;
      }

      return `*🔄 ${escapeSpecialChars(LABEL_MAP[key as keyof typeof LABEL_MAP])}*
> ${value.oldValue !== null ? `⏳ Old: ${escapeSpecialChars(value.oldValue)}` : ""}
> ${value.newValue !== null ? `⭐ New: ${escapeSpecialChars(value.newValue)}` : ""}
`;
    })
    .filter((line) => line !== null) // Filter out null lines
    .join("\n");
};

export {
  getOrderDifferences,
  getOrderDifferenceMessage,
  type GetOrderDifferenceOutput,
  type OrderDifference,
};
