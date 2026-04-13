import { test, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { readOrders, readIncome } from './readers';
import { fixtureBuffer } from './__tests__/fixtures';

test('readOrders parses raw Orders export with all required columns', async () => {
  const buf = fixtureBuffer('inputs/Orders.xlsx');
  const rows = await readOrders(buf);
  expect(rows.length).toBeGreaterThan(0);
  const first = rows[0];
  expect(first).toHaveProperty('orderId');
  expect(first).toHaveProperty('productName');
  expect(first).toHaveProperty('sku');
  expect(typeof first.dealPrice).toBe('number');
  expect(typeof first.quantity).toBe('number');
  expect(first).toHaveProperty('orderStatus');
});

test('readOrders throws SchemaError when a required column is missing', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('orders');
  ws.addRow(['Order ID', 'Product Name', 'Deal Price', 'Quantity', 'Order Status']);
  ws.addRow(['O1', 'P1', 10, 1, 'Completed']);
  const arr = await wb.xlsx.writeBuffer();
  const buf = Buffer.from(arr);
  await expect(readOrders(buf)).rejects.toMatchObject({
    kind: 'schema',
    sheet: 'orders',
    missing: ['SKU Reference No.'],
  });
});

test('readOrders throws ParseError when "orders" sheet is missing', async () => {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('something_else');
  const arr = await wb.xlsx.writeBuffer();
  const buf = Buffer.from(arr);
  await expect(readOrders(buf)).rejects.toMatchObject({ kind: 'parse' });
});

test('readIncome skips two prelude rows and parses the Income sheet', async () => {
  const buf = fixtureBuffer('inputs/Income.xlsx');
  const rows = await readIncome(buf);
  expect(rows.length).toBeGreaterThan(0);
  const first = rows[0];
  expect(first).toHaveProperty('viewBy');
  expect(first).toHaveProperty('orderId');
  expect(first).toHaveProperty('productName');
  // Raw row preserves original Shopee column names as keys for downstream transform
  expect(first).toHaveProperty('Shipping Fee Paid by Buyer');
  expect(first).toHaveProperty('Lost Compensation');
});

test('readIncome throws SchemaError when a required Income column is missing', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Income');
  // Two prelude rows then header
  ws.addRow(['junk header line 1']);
  ws.addRow(['junk header line 2']);
  // Missing 'Lost Compensation'
  ws.addRow([
    'View By', 'Order ID', 'Product Name',
    'Total Released Amount (S$)', 'Product Price', 'Refund Amount',
    'Rebate Provided by Shopee', 'Voucher Sponsored by Seller', 'Coin Cashback Sponsored by Seller',
    'Shipping Fee Paid by Buyer', 'Shipping Fee Charged by Logistic Provider', 'Shipping Rebate From Shopee',
    'Reverse Shipping Fee', 'Shipping Fee Saver Program Savings', 'Return to Seller Fee',
    'Commission fee (Incl. GST)', 'Transaction Fee (Incl. Gst)',
  ]);
  const arr = await wb.xlsx.writeBuffer();
  const buf = Buffer.from(arr);
  await expect(readIncome(buf)).rejects.toMatchObject({
    kind: 'schema',
    sheet: 'Income',
    missing: ['Lost Compensation'],
  });
});
