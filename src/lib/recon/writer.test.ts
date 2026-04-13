import { test, expect } from 'vitest';
import { writeWorkbook } from './writer';
import ExcelJS from 'exceljs';

test('writeWorkbook produces a 3-sheet XLSX with bold headers and expected structure', async () => {
  const buf = await writeWorkbook({
    compiled: [
      { sku: 'S1', orderId: 'O1', productName: 'P1', quantity: 1, totalOrderAmount: 10 },
      { sku: 'RF', orderId: 'O1', productName: 'Refund', quantity: null, totalOrderAmount: -2 },
    ],
    pivot: [{ sku: 'S1', totalQuantity: 1, totalOrderAmount: 10 }],
    summary: { totalReleased: 8, commissionFee: -1, transactionFee: -1, totalShippingFee: 0 },
  });

  const wb = new ExcelJS.Workbook();
  // Convert Buffer to ArrayBuffer for ExcelJS load (avoids strict typing issue)
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);

  expect(wb.worksheets.map((w) => w.name)).toEqual([
    'Income Compiled', 'Pivot Table', 'Income Summary',
  ]);

  const compiled = wb.getWorksheet('Income Compiled')!;
  expect(compiled.getRow(1).getCell(1).font?.bold).toBe(true);
  // Header values: 5 columns
  const headerValues: string[] = [];
  compiled.getRow(1).eachCell((c, col) => { headerValues[col - 1] = String(c.value); });
  expect(headerValues).toEqual([
    'SKU Reference No.', 'Order ID', 'Product Name', 'Quantity', 'Total Order Amount',
  ]);

  // Data row 1: S1, O1, P1, 1, 10
  expect(String(compiled.getRow(2).getCell(1).value)).toBe('S1');
  expect(compiled.getRow(2).getCell(5).value).toBe(10);

  // Data row 2: RF row, quantity is null → cell empty (null or undefined)
  expect(compiled.getRow(3).getCell(4).value ?? null).toBeNull();

  // Pivot Table headers
  const pivot = wb.getWorksheet('Pivot Table')!;
  const pivotHeaders: string[] = [];
  pivot.getRow(1).eachCell((c, col) => { pivotHeaders[col - 1] = String(c.value); });
  expect(pivotHeaders).toEqual([
    'SKU Reference No.', 'Total Quantity', 'Total Order Amount',
  ]);

  // Income Summary
  const summary = wb.getWorksheet('Income Summary')!;
  const summaryHeaders: string[] = [];
  summary.getRow(1).eachCell((c, col) => { summaryHeaders[col - 1] = String(c.value); });
  expect(summaryHeaders).toEqual([
    'Total Released Amount (S$)',
    'Commission fee (Incl. GST)',
    'Transaction Fee (Incl. Gst)',
    'Total Shipping Fee',
  ]);
  expect(summary.getRow(2).getCell(1).value).toBe(8);
});
