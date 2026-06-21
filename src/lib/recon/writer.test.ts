import { test, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { writeWorkbook } from './writer';
import type { SummaryRow, CompiledRow, ProductBreakdownRow } from './schema';

const summary: SummaryRow = {
  totalOrderAmount: 100, totalReleased: 90, commissionFee: -3, transactionFee: -1,
  totalShippingFee: -1, vouchersAndRebates: 0, serviceFee: -2, adjustments: 0.5,
  actualReleased: 90.5, totalExpenses: -7,
};

const compiled: CompiledRow[] = [
  { sku: 'SKU-A', orderId: 'ORD-001', productName: 'Product A', quantity: 2, totalOrderAmount: 50 },
];

const breakdown: ProductBreakdownRow[] = [
  { sku: 'SKU-A', totalQuantity: 2, revenuePerUnit: 25, totalOrderAmount: 50, totalFees: -5, netRevenue: 45 },
];

test('writeWorkbook Income Summary includes Service Fee, Adjustments, Actual Released', async () => {
  const buf = await writeWorkbook({ compiled, breakdown, summary });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const ws = wb.getWorksheet('Income Summary')!;
  const headers = ws.getRow(1).values as (string | undefined)[];
  expect(headers).toContain('Service Fee');
  expect(headers).toContain('Adjustments');
  expect(headers).toContain('Actual Released Amount');
  expect(headers).toContain('Total Expenses');
});

test('writeWorkbook produces all three worksheets', async () => {
  const buf = await writeWorkbook({ compiled, breakdown, summary });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const sheetNames = wb.worksheets.map((ws) => ws.name);
  expect(sheetNames).toContain('Income Compiled');
  expect(sheetNames).toContain('Product Breakdown');
  expect(sheetNames).toContain('Income Summary');
});

test('writeWorkbook Income Compiled has at least one data row', async () => {
  const buf = await writeWorkbook({ compiled, breakdown, summary });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const ws = wb.getWorksheet('Income Compiled')!;
  // Row 1 = headers, row 2+ = data
  expect(ws.rowCount).toBeGreaterThan(1);
  const firstDataRow = ws.getRow(2).values as (string | number | null | undefined)[];
  expect(firstDataRow).toContain('SKU-A');
});

test('writeWorkbook Product Breakdown has at least one data row', async () => {
  const buf = await writeWorkbook({ compiled, breakdown, summary });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const ws = wb.getWorksheet('Product Breakdown')!;
  // Row 1 = headers, row 2+ = data
  expect(ws.rowCount).toBeGreaterThan(1);
  const firstDataRow = ws.getRow(2).values as (string | number | null | undefined)[];
  expect(firstDataRow).toContain('SKU-A');
});
