import { test, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { writeWorkbook } from './writer';
import type { SummaryRow } from './schema';

const summary: SummaryRow = {
  totalOrderAmount: 100, totalReleased: 90, commissionFee: -3, transactionFee: -1,
  totalShippingFee: -1, vouchersAndRebates: 0, serviceFee: -2, adjustments: 0.5,
  actualReleased: 90.5, totalExpenses: -7,
};

test('writeWorkbook Income Summary includes Service Fee, Adjustments, Actual Released', async () => {
  const buf = await writeWorkbook({ compiled: [], breakdown: [], summary });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const ws = wb.getWorksheet('Income Summary')!;
  const headers = ws.getRow(1).values as (string | undefined)[];
  expect(headers).toContain('Service Fee');
  expect(headers).toContain('Adjustments');
  expect(headers).toContain('Actual Released Amount');
});
