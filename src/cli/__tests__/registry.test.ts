import { describe, it, expect, beforeAll } from "vitest";
import { getRegistry, getSchemaForProcedure } from "../registry";

// Expected routers and their procedures
const EXPECTED_PROCEDURES: Record<string, string[]> = {
  order: [
    "createOrder",
    "deleteOrder",
    "getFilteredOrders",
    "getFulfilmentMethods",
    "getGstPercentage",
    "getOrderDetails",
    "getPaymentMethods",
    "getPaymentStatuses",
    "updateOrderDetails",
    "updateOrderStatus",
  ],
  product: [
    "createProduct",
    "deleteProduct",
    "getBrands",
    "getCategories",
    "getFilteredProducts",
    "getFilterOptions",
    "getProductDetails",
    "updateProductDefaultPrice",
    "updateProductDetails",
  ],
  customer: [
    "createCustomer",
    "deleteCustomer",
    "getCustomerDetails",
    "getFilteredCustomers",
    "updateCustomerDetails",
  ],
  customerProduct: ["createPricing", "getPricing", "updatePricing"],
  salesAgent: ["getSalesAgents"],
  salesChannel: ["getSalesChannels"],
  orderStatus: ["getDefaultOrderStatus", "getOrderStatuses"],
  telegram: [
    "sendCustomerCreationMessage",
    "sendOrderCancelledUpdateMessage",
    "sendOrderCreationMessage",
    "sendOrderDeletionMessage",
    "sendOrderDetailsMessage",
    "sendOrderDetailsUpdateMessage",
    "sendOrderStatusUpdateMessage",
    "sendProductCreationMessage",
  ],
  auth: ["login"],
};

const TOTAL_PROCEDURES = Object.values(EXPECTED_PROCEDURES).reduce(
  (sum, procs) => sum + procs.length,
  0,
);

describe("registry", () => {
  let registry: ReturnType<typeof getRegistry>;

  beforeAll(() => {
    registry = getRegistry();
  });

  it("discovers all 40 procedures", () => {
    expect(registry.procedures).toHaveLength(TOTAL_PROCEDURES);
    expect(TOTAL_PROCEDURES).toBe(40);
  });

  it("returns procedures in a consistent order", () => {
    const paths = registry.procedures.map((p) => p.path);
    // Verify no duplicates and all paths are present
    expect(new Set(paths).size).toBe(paths.length);
    // Verify it's sorted (same sort as registry uses)
    for (let i = 1; i < paths.length; i++) {
      expect(
        paths[i - 1]!.localeCompare(paths[i]!) <= 0,
        `Expected "${paths[i - 1]}" to come before "${paths[i]}"`,
      ).toBe(true);
    }
  });

  describe.each(Object.entries(EXPECTED_PROCEDURES))(
    "router: %s",
    (routerName, expectedProcedures) => {
      it(`has ${expectedProcedures.length} procedures`, () => {
        const routerProcs = registry.procedures.filter(
          (p) => p.router === routerName,
        );
        expect(routerProcs).toHaveLength(expectedProcedures.length);
      });

      it.each(expectedProcedures)("has procedure: %s", (procName) => {
        const proc = registry.procedures.find(
          (p) => p.router === routerName && p.name === procName,
        );
        expect(proc).toBeDefined();
        expect(proc!.path).toBe(`${routerName}.${procName}`);
      });
    },
  );

  describe("procedure types", () => {
    it("marks queries correctly", () => {
      const queries = [
        "order.getFilteredOrders",
        "order.getOrderDetails",
        "order.getPaymentMethods",
        "product.getFilteredProducts",
        "customer.getFilteredCustomers",
        "customerProduct.getPricing",
        "salesAgent.getSalesAgents",
        "salesChannel.getSalesChannels",
        "orderStatus.getOrderStatuses",
      ];
      for (const path of queries) {
        const proc = registry.procedures.find((p) => p.path === path);
        expect(proc?.type, `${path} should be a query`).toBe("query");
      }
    });

    it("marks mutations correctly", () => {
      const mutations = [
        "auth.login",
        "order.createOrder",
        "order.deleteOrder",
        "order.updateOrderDetails",
        "order.updateOrderStatus",
        "product.createProduct",
        "product.deleteProduct",
        "customer.createCustomer",
        "customer.deleteCustomer",
        "customerProduct.createPricing",
        "telegram.sendOrderCreationMessage",
      ];
      for (const path of mutations) {
        const proc = registry.procedures.find((p) => p.path === path);
        expect(proc?.type, `${path} should be a mutation`).toBe("mutation");
      }
    });

    it("all telegram procedures are mutations", () => {
      const telegramProcs = registry.procedures.filter(
        (p) => p.router === "telegram",
      );
      for (const proc of telegramProcs) {
        expect(proc.type, `${proc.path} should be a mutation`).toBe("mutation");
      }
    });
  });

  describe("input schemas", () => {
    it("procedures with no input have null inputSchema", () => {
      const noInputProcs = [
        "order.getPaymentMethods",
        "order.getPaymentStatuses",
        "order.getFulfilmentMethods",
        "order.getGstPercentage",
        "product.getFilterOptions",
        "product.getBrands",
        "product.getCategories",
        "salesAgent.getSalesAgents",
        "salesChannel.getSalesChannels",
        "orderStatus.getOrderStatuses",
        "orderStatus.getDefaultOrderStatus",
      ];
      for (const path of noInputProcs) {
        const proc = registry.procedures.find((p) => p.path === path);
        expect(
          proc?.inputSchema,
          `${path} should have null inputSchema`,
        ).toBeNull();
      }
    });

    it("order.getOrderDetails has orderId in schema", () => {
      const proc = registry.procedures.find(
        (p) => p.path === "order.getOrderDetails",
      );
      expect(proc?.inputSchema).toBeDefined();
      const schema = proc!.inputSchema as Record<string, unknown>;
      const props = schema.properties as Record<string, unknown>;
      expect(props).toHaveProperty("orderId");
    });

    it("order.getFilteredOrders has sort, filters, pagination", () => {
      const proc = registry.procedures.find(
        (p) => p.path === "order.getFilteredOrders",
      );
      expect(proc?.inputSchema).toBeDefined();
      const schema = proc!.inputSchema as Record<string, unknown>;
      const props = schema.properties as Record<string, unknown>;
      expect(props).toHaveProperty("sort");
      expect(props).toHaveProperty("filters");
      expect(props).toHaveProperty("pagination");
    });

    it("customer.deleteCustomer has customerId as number", () => {
      const proc = registry.procedures.find(
        (p) => p.path === "customer.deleteCustomer",
      );
      const schema = proc!.inputSchema as Record<string, unknown>;
      const props = schema.properties as Record<string, { type: string }>;
      expect(props.customerId?.type).toBe("number");
    });

    it("product.getFilteredProducts has search, filters, sort, pagination", () => {
      const proc = registry.procedures.find(
        (p) => p.path === "product.getFilteredProducts",
      );
      expect(proc?.inputSchema).toBeDefined();
      const schema = proc!.inputSchema as Record<string, unknown>;
      const props = schema.properties as Record<string, unknown>;
      expect(props).toHaveProperty("search");
      expect(props).toHaveProperty("filters");
      expect(props).toHaveProperty("sort");
      expect(props).toHaveProperty("pagination");
    });
  });

  describe("getSchemaForProcedure", () => {
    it("returns procedure info for valid path", () => {
      const result = getSchemaForProcedure("order.getPaymentMethods");
      expect(result).toHaveProperty("path", "order.getPaymentMethods");
      expect(result).toHaveProperty("type", "query");
      expect(result).toHaveProperty("router", "order");
      expect(result).toHaveProperty("name", "getPaymentMethods");
    });

    it("returns error for invalid path", () => {
      const result = getSchemaForProcedure("nonexistent.procedure");
      expect(result).toHaveProperty("ok", false);
      expect(result).toHaveProperty("error");
      const err = result as { ok: false; error: { code: string } };
      expect(err.error.code).toBe("NOT_FOUND");
    });
  });
});
