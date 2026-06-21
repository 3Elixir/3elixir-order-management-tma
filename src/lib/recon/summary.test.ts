import { test, expect } from 'vitest';
import { buildIncomeSummary } from './summary';
import { readFixtureSheet } from './__tests__/fixtures';
import { readIncomeSummary, readAdjustments } from './readers';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IncomeRow, IncomeSummaryTab, AdjustmentData } from './schema';

// Stub values used by pre-Task-4 tests so they still compile.
// Assertions in those tests are re-baselined in Task 7.
const STUB_TAB: IncomeSummaryTab = {
  totalRevenue: 0, shippingSubtotal: 0, amsCommission: 0, commission: 0,
  serviceFee: 0, saverProgramFee: 0, transactionFee: 0, productGst: 0,
  shippingGst: 0, adsEscrow: 0, totalExpenses: 0, totalReleased: 0,
};
const STUB_ADJ: AdjustmentData = { total: 0, items: [] };

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
  const actual = buildIncomeSummary(income, STUB_TAB, STUB_ADJ);

  expect(actual.totalReleased).toBeCloseTo(Number(expectedRow['Total Released Amount (S$)']), 2);
  expect(actual.commissionFee).toBeCloseTo(Number(expectedRow['Commission fee (Incl. GST)']), 2);
  expect(actual.transactionFee).toBeCloseTo(Number(expectedRow['Transaction Fee (Incl. Gst)']), 2);
  expect(actual.totalShippingFee).toBeCloseTo(Number(expectedRow['Total Shipping Fee']), 2);
});

test('buildIncomeSummary returns zeros for empty input', () => {
  expect(buildIncomeSummary([], STUB_TAB, STUB_ADJ)).toEqual({
    totalReleased: 0,
    commissionFee: 0,
    transactionFee: 0,
    totalShippingFee: 0,
  });
});

test('Income Summary uses Shopee Summary-tab service fee + adjustments (Feb)', async () => {
  const b = readFileSync(join(__dirname, '__tests__/fixtures/income/2026-02.xlsx'));
  const tab = await readIncomeSummary(b);
  const adj = await readAdjustments(b);
  const out = buildIncomeSummary([], tab, adj); // income rows not needed for these fields
  expect(out.serviceFee).toBeCloseTo(-1428.44, 2);
  expect(out.adjustments).toBeCloseTo(41.20, 2);
  expect(out.actualReleased).toBeCloseTo(36046.38, 2);
  expect(out.totalExpenses).toBeCloseTo(-7196.85, 2);
});
