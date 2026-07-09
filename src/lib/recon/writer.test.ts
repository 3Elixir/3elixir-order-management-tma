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

test('writeWorkbook Income Summary has an Unattributed column = Total Order Amount - Actual Released', async () => {
  const buf = await writeWorkbook({ compiled, breakdown, summary });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const ws = wb.getWorksheet('Income Summary')!;
  const headers = ws.getRow(1).values as (string | undefined)[];
  expect(headers).toContain('Unattributed');
  const col = headers.indexOf('Unattributed');
  const value = ws.getRow(2).getCell(col).value;
  // 100 (attributed) - 90.5 (actual released) = 9.5
  expect(value).toBeCloseTo(9.5, 2);
});

test('writeWorkbook produces all four worksheets', async () => {
  const buf = await writeWorkbook({ compiled, breakdown, summary });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const sheetNames = wb.worksheets.map((ws) => ws.name);
  expect(sheetNames).toContain('Income Compiled');
  expect(sheetNames).toContain('Product Breakdown');
  expect(sheetNames).toContain('Income Summary');
  expect(sheetNames).toContain('Unmatched');
});

test('writeWorkbook Unmatched sheet lists the provided unmatched income rows', async () => {
  const unmatched = [
    { orderId: 'ORD-U1', productName: 'Mystery Item', totalReleased: 12.34 },
    { orderId: 'ORD-U2', productName: 'Another Item', totalReleased: 56.78 },
  ];
  const buf = await writeWorkbook({ compiled, breakdown, summary, unmatched });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const ws = wb.getWorksheet('Unmatched')!;
  const headers = ws.getRow(1).values as (string | undefined)[];
  expect(headers).toContain('Order ID');
  expect(headers).toContain('Product Name');
  // Header row + 2 data rows
  expect(ws.rowCount).toBe(3);
  const firstData = ws.getRow(2).values as (string | number | null | undefined)[];
  expect(firstData).toContain('ORD-U1');
  expect(firstData).toContain('Mystery Item');
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
