import { test, expect } from 'vitest';
import { leftJoin, unmatched } from './join';
import type { OrderRow, IncomeRow } from './schema';

const orders: OrderRow[] = [
  { orderId: 'O1', productName: 'P1', sku: 'S1', dealPrice: 10, quantity: 2, totalOrderAmount: 20 },
  { orderId: 'O2', productName: 'P2', sku: 'S2', dealPrice: 5, quantity: 1, totalOrderAmount: 5 },
];

const income: IncomeRow[] = [
  {
    orderId: 'O1', productName: 'P1', productPrice: 18, refundAmount: 0, totalReleased: 16,
    totalShippingFee: -2, commissionFee: -1, transactionFee: 0, vouchersAndRebates: 0, lostCompensation: 0,
  },
  {
    orderId: 'OX', productName: 'PX', productPrice: 9, refundAmount: 0, totalReleased: 8,
    totalShippingFee: 0, commissionFee: 0, transactionFee: 0, vouchersAndRebates: 0, lostCompensation: 0,
  },
];

test('leftJoin attaches order fields when (orderId, productName) matches', () => {
  const merged = leftJoin(income, orders);
  expect(merged).toHaveLength(2);
  expect(merged[0].sku).toBe('S1');
  expect(merged[0].quantity).toBe(2);
  expect(merged[0].totalOrderAmount).toBe(20);
});

test('leftJoin keeps income rows with no matching order, with order fields undefined', () => {
  const merged = leftJoin(income, orders);
  expect(merged[1].sku).toBeUndefined();
  expect(merged[1].quantity).toBeUndefined();
  expect(merged[1].totalOrderAmount).toBeUndefined();
});

test('unmatched returns rows without sku', () => {
  const merged = leftJoin(income, orders);
  const u = unmatched(merged);
  expect(u).toHaveLength(1);
  expect(u[0].orderId).toBe('OX');
});

test('leftJoin row order matches input income order', () => {
  const merged = leftJoin(income, orders);
  expect(merged.map((r) => r.orderId)).toEqual(['O1', 'OX']);
});
