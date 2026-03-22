import { describe, it, expect } from "vitest";
import { formatSuccess, formatError } from "../output";
import { TRPCError } from "@trpc/server";
import { z, ZodError } from "zod";

describe("output", () => {
  describe("formatSuccess", () => {
    it("wraps data in success envelope", () => {
      const result = formatSuccess("order.getPaymentMethods", "query", [
        { id: 1, name: "Cash" },
      ]);
      expect(result).toEqual({
        ok: true,
        procedure: "order.getPaymentMethods",
        type: "query",
        data: [{ id: 1, name: "Cash" }],
      });
    });

    it("handles null data", () => {
      const result = formatSuccess("order.getGstPercentage", "query", null);
      expect(result.ok).toBe(true);
      expect(result.data).toBeNull();
    });

    it("handles empty array data", () => {
      const result = formatSuccess("order.getFilteredOrders", "query", []);
      expect(result.ok).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("formatError", () => {
    it("formats TRPCError correctly", () => {
      const trpcError = new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
      const result = formatError("order.getOrderDetails", trpcError);
      expect(result).toEqual({
        ok: false,
        procedure: "order.getOrderDetails",
        error: {
          code: "NOT_FOUND",
          message: "Order not found",
          zodErrors: null,
        },
      });
    });

    it("formats TRPCError with Zod cause", () => {
      const schema = z.object({ orderId: z.string() });
      let zodError: ZodError;
      try {
        schema.parse({ orderId: 123 });
        throw new Error("should not reach");
      } catch (e) {
        zodError = e as ZodError;
      }

      const trpcError = new TRPCError({
        code: "BAD_REQUEST",
        message: "Validation failed",
        cause: zodError!,
      });
      const result = formatError("order.getOrderDetails", trpcError);
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.zodErrors).toBeDefined();
      expect(result.error.zodErrors!.fieldErrors).toHaveProperty("orderId");
    });

    it("formats standalone ZodError", () => {
      const schema = z.object({
        customerId: z.number(),
        name: z.string(),
      });
      let zodError: ZodError;
      try {
        schema.parse({ customerId: "abc", name: 123 });
        throw new Error("should not reach");
      } catch (e) {
        zodError = e as ZodError;
      }

      const result = formatError("customer.createCustomer", zodError!);
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.message).toBe("Input validation failed");
      expect(result.error.zodErrors).toBeDefined();
      expect(result.error.zodErrors!.fieldErrors).toHaveProperty("customerId");
      expect(result.error.zodErrors!.fieldErrors).toHaveProperty("name");
    });

    it("formats generic Error", () => {
      const result = formatError(
        "order.createOrder",
        new Error("Network timeout"),
      );
      expect(result).toEqual({
        ok: false,
        procedure: "order.createOrder",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Network timeout",
          zodErrors: null,
        },
      });
    });

    it("formats non-Error thrown value", () => {
      const result = formatError("order.createOrder", "something went wrong");
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
      expect(result.error.message).toBe("Unknown error occurred");
    });
  });
});
