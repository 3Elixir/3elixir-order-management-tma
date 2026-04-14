import { test, expect } from 'vitest';
import { buildIncomeSummary } from './summary';
import { readFixtureSheet } from './__tests__/fixtures';
import type { IncomeRow } from './schema';

test('buildIncomeSummary matches Output_Updated.xlsx[Income Summary]', async () => {
  const incomeRaw = await readFixtureSheet('Income_DF_Export.xlsx', 'Sheet1');
  const income: IncomeRow[] = incomeRaw.map((r) => ({
    orderId: String(r['Order ID']),
    productName: String(r['Product Name']),
    productPrice: Number(r['Product Price']),
    refundAmount: Number(r['Refund Amount']),
    totalReleased: Number(r['Total Released Amount (S$)']),
    totalShippingFee: Number(r['Total Shipping Fee']),
    commissionFee: Number(r['Commission fee (Incl. GST)']),
    transactionFee: Number(r['Transaction Fee (Incl. Gst)']),
    vouchersAndRebates: Number(r['Vouchers & Rebates']),
    lostCompensation: r['Lost Compensation'] === '-' ? 0 : Number(r['Lost Compensation']),
  }));

  const expectedRow = (await readFixtureSheet('Output_Updated.xlsx', 'Income Summary'))[0];
  const actual = buildIncomeSummary(income);

  expect(actual.totalReleased).toBeCloseTo(Number(expectedRow['Total Released Amount (S$)']), 2);
  expect(actual.commissionFee).toBeCloseTo(Number(expectedRow['Commission fee (Incl. GST)']), 2);
  expect(actual.transactionFee).toBeCloseTo(Number(expectedRow['Transaction Fee (Incl. Gst)']), 2);
  expect(actual.totalShippingFee).toBeCloseTo(Number(expectedRow['Total Shipping Fee']), 2);
});

test('buildIncomeSummary returns zeros for empty input', () => {
  expect(buildIncomeSummary([])).toEqual({
    totalReleased: 0,
    commissionFee: 0,
    transactionFee: 0,
    totalShippingFee: 0,
  });
});
