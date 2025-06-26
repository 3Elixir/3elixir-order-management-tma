import { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "../server/api/root";
import { escapeSpecialChars } from "~/lib/utils";
import {
  compareOrderProducts,
  formatProductChanges,
} from "~/lib/orderProductsDiff";
import { formatInTimeZone } from "date-fns-tz";

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
  try {
    // Initialize all keys with null
    const initialDifferences = Object.fromEntries(
      typedObjectKeys(prevData).map((key) => [key, null]),
    ) as GetOrderDifferenceOutput;

    // Process all keys that are not excluded
    const result = typedObjectKeys(prevData)
      .filter((key) => !excludedKeys.includes(key))
      .reduce((acc, key) => {
        try {
          // Special handling for orderProducts
          if (key === "orderProducts") {
            const orderProductsDifference = getOrderProductsDifference(
              prevData.orderProducts,
              currentData.orderProducts,
            );
            if (orderProductsDifference) {
              acc[key] = orderProductsDifference;
            }
            return acc;
          }

          // Standard handling for other fields
          const prevValue = prevData[key];
          const currentValue = currentData[key];

          const difference =
            compareSimpleValues(prevValue, currentValue) ||
            compareNestedObjects(prevValue, currentValue, key);

          if (difference) {
            acc[key] = difference;
          }
        } catch (error) {
          console.error(`Error comparing key ${String(key)}:`, error);
          // Skip this field if there's an error processing it
        }
        return acc;
      }, initialDifferences);

    return result;
  } catch (error) {
    console.error("Error in getOrderDifferences:", error);
    // Return an empty difference object in case of error
    return {} as GetOrderDifferenceOutput;
  }
};

const getOrderDifferenceMessage = (differences: GetOrderDifferenceOutput) => {
  return Object.entries(differences)
    .map(([key, value]) => {
      if (value === null) return null; // Skip null values

      // Special handling for dates
      if (key === "fulfilmentStart" || key === "fulfilmentEnd" || key === "updatedAt" || key === "createdAt" || key === "publishedAt" || key === "orderCollectionDateTime") {
        const oldValue = value.oldValue
          ? `⏳ Old: ${formatInTimeZone(value.oldValue, "Asia/Singapore", "dd/MM/yyyy - h:mm a")}`
          : "⏳ Old: N/A";
        const newValue = value.newValue
          ? `⭐ New: ${formatInTimeZone(value.newValue, "Asia/Singapore", "dd/MM/yyyy - h:mm a")}`
          : "⭐ New: N/A";
        return `*🔄 ${escapeSpecialChars(LABEL_MAP[key as keyof typeof LABEL_MAP])}*\n> ${oldValue}\n> ${newValue}`;
      }

      // Special handling for boolean values
      if (key === "excludeGst") {
        const oldValue = value.oldValue === "true" ? "Yes" : "No";
        const newValue = value.newValue === "true" ? "Yes" : "No";
        return `*🔄 ${escapeSpecialChars(LABEL_MAP[key as keyof typeof LABEL_MAP])}*\n> ⏳ Old: ${oldValue}\n> ⭐ New: ${newValue}`;
      }

      // Special handling for attentionTo
      if (key === "attentionTo") {
        const oldValue = value.oldValue
          ? `⏳ Old: ${escapeSpecialChars(value.oldValue)}`
          : "⏳ Old: N/A";
        const newValue = value.newValue
          ? `⭐ New: ${escapeSpecialChars(value.newValue)}`
          : "⭐ New: N/A";
        return `*🔄 ${escapeSpecialChars(LABEL_MAP[key as keyof typeof LABEL_MAP])}*\n> ${oldValue}\n> ${newValue}`;
      }

      // Special handling for order products
      if (key === "orderProducts") {
        let result = `*🔄 ${escapeSpecialChars(LABEL_MAP[key as keyof typeof LABEL_MAP])}*\n`;

        try {
          // With the new algorithm, we only use the newValue field for the consolidated changes
          if (value.newValue !== null) {
            if (typeof value.newValue === "string") {
              value.newValue.split("\n").forEach((line) => {
                if (line.trim()) {
                  result += `> ${escapeSpecialChars(line)}\n`;
                } else {
                  result += `>\n`; // Keep empty lines for formatting
                }
              });
            } else {
              result += `> Error: Could not parse product changes\n`;
            }
          } else {
            result += `> No product changes detected\n`;
          }
        } catch (error) {
          console.error("Error formatting order products difference:", error);
          result += `> Error parsing product differences. Please check order manually.\n`;
        }

        return result;
      }

      // Default handling for other fields
      return `*🔄 ${escapeSpecialChars(LABEL_MAP[key as keyof typeof LABEL_MAP])}*
> ${value.oldValue !== null ? `⏳ Old: ${escapeSpecialChars(value.oldValue)}` : ""}
> ${value.newValue !== null ? `⭐ New: ${escapeSpecialChars(value.newValue)}` : ""}
`;
    })
    .filter((line) => line !== null) // Filter out null lines
    .join("\n");
};

const getOrderProductsDifference = (
  prevProducts: GetOrderDetailsOutput["orderProducts"],
  currentProducts: UpdateOrderDetailsOutput["orderProducts"],
): OrderDifference => {
  try {
    // Ensure we have arrays to work with and handle null/undefined gracefully
    const prev = Array.isArray(prevProducts) ? prevProducts : [];
    const current = Array.isArray(currentProducts) ? currentProducts : [];

    // If both arrays are empty, there's no difference
    if (prev.length === 0 && current.length === 0) {
      return null;
    }

    // Use the new algorithm to compare products
    const productChanges = compareOrderProducts(prev, current);

    // If no changes were detected, return null
    if (productChanges.length === 0) {
      return null;
    }

    // Format the changes using the helper function
    const formattedChanges = formatProductChanges(productChanges);

    // Use the formatted changes for both old and new value fields
    // This is a slightly different approach from before, showing a unified diff view
    return {
      oldValue: null,
      newValue: formattedChanges,
    };
  } catch (error) {
    console.error("Error in getOrderProductsDifference:", error);
    return {
      oldValue: "Error calculating product differences",
      newValue: "Please check order products manually",
    };
  }
};

export {
  getOrderDifferences,
  getOrderDifferenceMessage,
  getOrderProductsDifference,
  type GetOrderDifferenceOutput,
  type OrderDifference,
};
