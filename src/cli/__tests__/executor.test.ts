import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseInput, getProcedureType } from "../executor";

// Build a stable mock caller singleton so tests can inspect the same instance
const fn = () => vi.fn().mockResolvedValue({ mocked: true });
const mockCaller = {
  order: {
    getFilteredOrders: fn(),
    getOrderDetails: fn(),
    createOrder: fn(),
    updateOrderDetails: fn(),
    deleteOrder: fn(),
    updateOrderStatus: fn(),
    getPaymentMethods: fn(),
    getPaymentStatuses: fn(),
    getFulfilmentMethods: fn(),
    getGstPercentage: fn(),
  },
  product: {
    getFilteredProducts: fn(),
    getProductDetails: fn(),
    createProduct: fn(),
    updateProductDetails: fn(),
    updateProductDefaultPrice: fn(),
    deleteProduct: fn(),
    getFilterOptions: fn(),
    getBrands: fn(),
    getCategories: fn(),
  },
  customer: {
    createCustomer: fn(),
    getFilteredCustomers: fn(),
    getCustomerDetails: fn(),
    updateCustomerDetails: fn(),
    deleteCustomer: fn(),
  },
  customerProduct: {
    getPricing: fn(),
    createPricing: fn(),
    updatePricing: fn(),
  },
  salesAgent: {
    getSalesAgents: fn(),
  },
  salesChannel: {
    getSalesChannels: fn(),
  },
  orderStatus: {
    getOrderStatuses: fn(),
    getDefaultOrderStatus: fn(),
  },
  telegram: {
    sendOrderCreationMessage: fn(),
    sendOrderDetailsMessage: fn(),
    sendOrderDeletionMessage: fn(),
    sendOrderStatusUpdateMessage: fn(),
    sendOrderDetailsUpdateMessage: fn(),
    sendOrderCancelledUpdateMessage: fn(),
    sendProductCreationMessage: fn(),
    sendCustomerCreationMessage: fn(),
  },
};

// Mock the caller module to return our singleton
vi.mock("../caller", () => ({
  getCaller: vi.fn(() => mockCaller),
}));

// Must import after mock setup
import { executeProcedure } from "../executor";

describe("parseInput", () => {
  it("parses simple JSON", () => {
    const result = parseInput('{"orderId": "42"}');
    expect(result).toEqual({ orderId: "42" });
  });

  it("converts ISO date strings to Date objects", () => {
    const result = parseInput(
      '{"date": "2024-06-15T10:30:00.000Z"}',
    ) as Record<string, unknown>;
    expect(result.date).toBeInstanceOf(Date);
    expect((result.date as Date).toISOString()).toBe(
      "2024-06-15T10:30:00.000Z",
    );
  });

  it("converts nested date strings", () => {
    const result = parseInput(
      '{"order": {"fulfilmentStart": "2024-06-15T08:00:00.000Z", "name": "test"}}',
    ) as Record<string, Record<string, unknown>>;
    expect(result.order!.fulfilmentStart).toBeInstanceOf(Date);
    expect(result.order!.name).toBe("test");
  });

  it("does not convert non-ISO strings", () => {
    const result = parseInput('{"name": "hello world"}') as Record<
      string,
      unknown
    >;
    expect(result.name).toBe("hello world");
    expect(typeof result.name).toBe("string");
  });

  it("does not convert partial date-like strings", () => {
    const result = parseInput('{"ref": "2024-06-15"}') as Record<
      string,
      unknown
    >;
    // "2024-06-15" doesn't match the T\d{2}:\d{2} pattern
    expect(typeof result.ref).toBe("string");
  });

  it("handles arrays with dates", () => {
    const result = parseInput(
      '{"dates": ["2024-06-15T10:30:00.000Z", "not-a-date"]}',
    ) as Record<string, unknown[]>;
    expect(result.dates![0]).toBeInstanceOf(Date);
    expect(result.dates![1]).toBe("not-a-date");
  });

  it("handles numbers and booleans unchanged", () => {
    const result = parseInput(
      '{"count": 5, "active": true, "price": null}',
    ) as Record<string, unknown>;
    expect(result.count).toBe(5);
    expect(result.active).toBe(true);
    expect(result.price).toBeNull();
  });
});

describe("getProcedureType", () => {
  it("returns 'query' for query procedures", () => {
    expect(getProcedureType("order.getPaymentMethods")).toBe("query");
    expect(getProcedureType("product.getFilteredProducts")).toBe("query");
    expect(getProcedureType("customer.getCustomerDetails")).toBe("query");
  });

  it("returns 'mutation' for mutation procedures", () => {
    expect(getProcedureType("order.createOrder")).toBe("mutation");
    expect(getProcedureType("product.deleteProduct")).toBe("mutation");
    expect(getProcedureType("telegram.sendOrderCreationMessage")).toBe(
      "mutation",
    );
  });

  it("returns null for non-existent procedures", () => {
    expect(getProcedureType("nonexistent.procedure")).toBeNull();
  });
});

describe("executeProcedure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the correct procedure on the caller", async () => {
    await executeProcedure("order.getPaymentMethods", undefined);

    expect(mockCaller.order.getPaymentMethods).toHaveBeenCalledWith(undefined);
  });

  it("passes input to the procedure", async () => {
    const input = { orderId: "42" };
    await executeProcedure("order.getOrderDetails", input);

    expect(mockCaller.order.getOrderDetails).toHaveBeenCalledWith(input);
  });

  it("returns the procedure result", async () => {
    const result = await executeProcedure(
      "order.getPaymentMethods",
      undefined,
    );
    expect(result).toEqual({ mocked: true });
  });

  it("calls customer procedures correctly", async () => {
    await executeProcedure("customer.deleteCustomer", { customerId: 5 });

    expect(mockCaller.customer.deleteCustomer).toHaveBeenCalledWith({
      customerId: 5,
    });
  });

  it("calls nested router (customerProduct) correctly", async () => {
    const input = { customerId: 1, productId: 2 };
    await executeProcedure("customerProduct.getPricing", input);

    expect(mockCaller.customerProduct.getPricing).toHaveBeenCalledWith(input);
  });

  it("calls telegram procedures correctly", async () => {
    const input = { chatId: 123, orderId: 456 };
    await executeProcedure("telegram.sendOrderCreationMessage", input);

    expect(mockCaller.telegram.sendOrderCreationMessage).toHaveBeenCalledWith(
      input,
    );
  });

  it("throws for non-existent procedure", async () => {
    await expect(
      executeProcedure("nonexistent.procedure", undefined),
    ).rejects.toThrow("not found");
  });

  it("throws for non-existent router", async () => {
    await expect(
      executeProcedure("fake.getStuff", undefined),
    ).rejects.toThrow("not found");
  });
});
