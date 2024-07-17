import { isAfter, isEqual } from "date-fns";
import { z } from "zod";

export const orderFormStep1Schema = z.object({
  customerName: z.string().min(1, "Customer Name is required"),
  customerAddress: z.string(),
  customerContact: z.string().min(1, "Contact is required"),
  paymentMethod: z.object({
    id: z.string().min(1, "Payment Method is required"),
    name: z.string(),
  }),
  paymentStatus: z.object({
    id: z.string().min(1, "Payment Status is required"),
    name: z.string(),
  }),
});

export const orderFormStep2Schema = z.object({
  fulfilmentDates: z
    .object({
      hasEnd: z.boolean(),
      fulfilmentStart: z.date(),
      fulfilmentEnd: z.date(),
    })
    .refine(
      ({ fulfilmentStart, fulfilmentEnd, hasEnd }) => {
        // If there is no end date, return true
        if (!hasEnd) return true;

        // Otherwise, ensure end date is after start date
        return (
          isEqual(fulfilmentStart, fulfilmentEnd) ||
          isAfter(fulfilmentEnd, fulfilmentStart)
        );
      },
      {
        message: "End datetime must be after start datetime",
      },
    ),
  orderCollectionDateTime: z.date(),
  fulfilmentMethod: z.object({
    id: z.string().min(1, "Fulfilment Method is required"),
    name: z.string(),
  }),
  orderStatus: z.object({
    id: z.string().min(1, "Order Status is required"),
    name: z.string(),
  }),

  salesChannel: z.object({
    id: z.string().min(1, "Sales Channel is required"),
    name: z.string(),
  }),
  salesAgents: z
    .array(
      z.object({
        value: z.object({
          id: z.string().min(1, "Sales Agent is required"),
          name: z.string(),
        }),
      }),
    )
    .refine(
      (agents) => {
        // Ensure there is no duplicate agent
        const agentIds = agents.map((agent) => agent.value.id);
        return new Set(agentIds).size === agentIds.length;
      },
      {
        message: "Duplicate Sales Agents are not allowed",
      },
    ),
});

export const orderFormStep3Schema = z.object({
  orderProducts: z
    .array(
      z.object({
        productId: z.number(),
        name: z.string(),
        sku: z.string(),
        category: z.string(),
        brand: z.string(),
        quantity: z
          .number()
          .min(1, "Quantity must be at least 1")
          .max(1000, "Quantity cannot exceed 1000"),
        price: z.number().min(0, "Price cannot be negative"),
      }),
    )
    .min(1, "At least one product is required"),
});

export const orderFormStep4Schema = z.object({
  remarks: z.string(),
  deliveryFee: z.number().min(0, "Delivery Fee cannot be negative"),
});

// Combine all schemas into one
export const orderFormSchema = orderFormStep1Schema
  .merge(orderFormStep2Schema)
  .merge(orderFormStep3Schema)
  .merge(orderFormStep4Schema);

// sales channels that require sales agents
export const SALES_CHANNELS_WITH_SALES_AGENTS = ["walk-in", "b2c", "b2b"];
