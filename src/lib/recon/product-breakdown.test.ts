import { test, expect } from 'vitest';
import { buildProductBreakdown } from './product-breakdown';

type BI = Parameters<typeof buildProductBreakdown>[0][number];

function bi(over: Partial<BI> & { serviceFee?: number } = {}): BI {
  return {
    orderId: 'O1', sku: 'S1', quantity: 2, totalOrderAmount: 100, productName: 'P1',
    commissionFee: -3, transactionFee: -1, totalShippingFee: -2, serviceFee: -4,
    ...over,
  } as BI;
}

test('netRevenue = revenue minus fees (fees are negative, so net < revenue)', () => {
  const [row] = buildProductBreakdown([bi()]);
  // fees: commission -3, transaction -1, shipping -2, service -4 => total -10
  expect(row.totalFees).toBeCloseTo(-10, 2);
  // net = revenue + fees = 100 + (-10) = 90, and must be LESS than gross revenue
  expect(row.netRevenue).toBeCloseTo(90, 2);
  expect(row.netRevenue).toBeLessThan(row.totalOrderAmount);
});

test('totalFees includes Service Fee', () => {
  const [row] = buildProductBreakdown([bi({ serviceFee: -50 })]);
  // -3 -1 -2 -50 = -56
  expect(row.totalFees).toBeCloseTo(-56, 2);
  expect(row.netRevenue).toBeCloseTo(44, 2);
});

test('(Unmatched) row netRevenue carries the negative fee (not its inverse)', () => {
  const unmatched = [{
    orderId: 'OX', productName: 'PX', productPrice: 0, refundAmount: 0, totalReleased: 0,
    totalShippingFee: -2, commissionFee: -3, transactionFee: -1, vouchersAndRebates: 0,
    lostCompensation: 0, serviceFee: -4,
  }];
  const out = buildProductBreakdown([bi()], unmatched);
  const u = out.find((r) => r.sku === '(Unmatched)')!;
  // unmatched fees = -3 -1 -2 -4 = -10 ; net for a zero-revenue row = 0 + (-10) = -10
  expect(u.totalFees).toBeCloseTo(-10, 2);
  expect(u.netRevenue).toBeCloseTo(-10, 2);
});
