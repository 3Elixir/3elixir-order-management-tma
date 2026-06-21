import { test, expect } from 'vitest';
import { filterCompletedOrders, computeOrderTotals, filterSkuView, computeIncomeAggregates } from './transform';
import type { RawOrderRow, RawIncomeRow } from './readers';

function makeIncomeRow(overrides: Partial<RawIncomeRow> = {}): RawIncomeRow {
  const base = {
    viewBy: 'Sku',
    orderId: 'O1',
    productName: 'P1',
    'View By': 'Sku',
    'Order ID': 'O1',
    'Product Name': 'P1',
    'Product Price': 100,
    'Refund Amount': 0,
    'Total Released Amount (S$)': 95,
    'Rebate Provided by Shopee': 0,
    'Voucher Sponsored by Seller': 0,
    'Coin Cashback Sponsored by Seller': 0,
    'Shipping Fee Paid by Buyer': 5,
    'Shipping Fee Charged by Logistic Provider': -3,
    'Shipping Rebate From Shopee': 0,
    'Reverse Shipping Fee': 0,
    'Shipping Fee Saver Program Savings': 0,
    'Return to Seller Fee': 0,
    'Commission fee (Incl. GST)': -2,
    'Transaction Fee (Incl. Gst)': -1,
    'Lost Compensation': 0,
  };
  return { ...base, ...overrides } as RawIncomeRow;
}

const sample: RawOrderRow[] = [
  { orderId: 'O1', productName: 'P1', sku: 'S1', dealPrice: 10, quantity: 2, orderStatus: 'Completed' },
  { orderId: 'O2', productName: 'P2', sku: 'S2', dealPrice: 5, quantity: 3, orderStatus: 'Cancelled' },
  { orderId: 'O3', productName: 'P3', sku: 'S3', dealPrice: 7, quantity: 1, orderStatus: 'Completed' },
];

test('filterCompletedOrders keeps only Order Status === "Completed"', () => {
  const out = filterCompletedOrders(sample);
  expect(out.map((r) => r.orderId)).toEqual(['O1', 'O3']);
});

test('computeOrderTotals adds totalOrderAmount = dealPrice * quantity and drops orderStatus', () => {
  const out = computeOrderTotals(filterCompletedOrders(sample));
  expect(out[0].totalOrderAmount).toBe(20);
  expect(out[1].totalOrderAmount).toBe(7);
  // Confirm orderStatus is dropped from final OrderRow shape
  expect(out[0]).not.toHaveProperty('orderStatus');
});

test('filterSkuView keeps only View By === "Sku"', () => {
  const rows = [
    makeIncomeRow({ viewBy: 'Sku', 'View By': 'Sku' }),
    makeIncomeRow({ viewBy: 'Order', 'View By': 'Order' }),
  ];
  const out = filterSkuView(rows);
  expect(out).toHaveLength(1);
});

test('computeIncomeAggregates sums shipping/vouchers and coerces "-" to 0', () => {
  const rows = [
    makeIncomeRow({
      'Shipping Fee Paid by Buyer': 5,
      'Shipping Fee Charged by Logistic Provider': -3,
      'Shipping Rebate From Shopee': 1,
      'Reverse Shipping Fee': 0,
      'Shipping Fee Saver Program Savings': 0,
      'Return to Seller Fee': 0,
      'Rebate Provided by Shopee': -2,
      'Voucher Sponsored by Seller': -1,
      'Coin Cashback Sponsored by Seller': 0,
      'Lost Compensation': '-',
    }),
  ];
  const [out] = computeIncomeAggregates(rows);
  expect(out.totalShippingFee).toBeCloseTo(3, 5);
  expect(out.vouchersAndRebates).toBeCloseTo(-3, 5);
  expect(out.lostCompensation).toBe(0);
});

test('computeIncomeAggregates rounds totalShippingFee to 2dp', () => {
  const rows = [
    makeIncomeRow({
      'Shipping Fee Paid by Buyer': 1.005,
      'Shipping Fee Charged by Logistic Provider': 0,
      'Shipping Rebate From Shopee': 0,
      'Reverse Shipping Fee': 0,
      'Shipping Fee Saver Program Savings': 0,
      'Return to Seller Fee': 0,
    }),
  ];
  const [out] = computeIncomeAggregates(rows);
  expect(out.totalShippingFee).toBe(1.01);
});

test('computeIncomeAggregates rounds negative halves away from zero', () => {
  const rows = [
    makeIncomeRow({
      'Shipping Fee Paid by Buyer': -1.005,
      'Shipping Fee Charged by Logistic Provider': 0,
      'Shipping Rebate From Shopee': 0,
      'Reverse Shipping Fee': 0,
      'Shipping Fee Saver Program Savings': 0,
      'Return to Seller Fee': 0,
    }),
  ];
  const [out] = computeIncomeAggregates(rows);
  expect(out.totalShippingFee).toBe(-1.01);
});

test('computeIncomeAggregates produces canonical IncomeRow shape', () => {
  const [out] = computeIncomeAggregates([makeIncomeRow()]);
  expect(out).toEqual({
    orderId: 'O1',
    productName: 'P1',
    productPrice: 100,
    refundAmount: 0,
    totalReleased: 95,
    totalShippingFee: 2,           // 5 + (-3) = 2
    commissionFee: -2,
    transactionFee: -1,
    vouchersAndRebates: 0,         // 0+0+0
    lostCompensation: 0,
    serviceFee: 0,                 // added in Task 5/6 for SC rows
  });
});
