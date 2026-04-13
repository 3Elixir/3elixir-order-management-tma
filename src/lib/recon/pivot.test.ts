import { test, expect } from 'vitest';
import { buildPivotTable } from './pivot';
import { readFixtureSheet } from './__tests__/fixtures';
import type { OrderRow } from './schema';

test('buildPivotTable matches Output_Updated.xlsx[Pivot Table] row-by-row', async () => {
  const ordersRaw = await readFixtureSheet('Orders_DF_Export.xlsx', 'Sheet1');
  const orders: OrderRow[] = ordersRaw.map((r) => ({
    orderId: String(r['Order ID']),
    productName: String(r['Product Name']),
    sku: String(r['SKU Reference No.']),
    dealPrice: Number(r['Deal Price']),
    quantity: Number(r['Quantity']),
    totalOrderAmount: Number(r['Total Order Amount']),
  }));

  const expected = (await readFixtureSheet('Output_Updated.xlsx', 'Pivot Table')).map((r) => ({
    sku: String(r['SKU Reference No.']),
    totalQuantity: Number(r['Total Quantity']),
    totalOrderAmount: Number(r['Total Order Amount']),
  }));

  const actual = buildPivotTable(orders);
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(actual[i].sku).toBe(expected[i].sku);
    expect(actual[i].totalQuantity).toBe(expected[i].totalQuantity);
    expect(actual[i].totalOrderAmount).toBeCloseTo(expected[i].totalOrderAmount, 2);
  }
});
