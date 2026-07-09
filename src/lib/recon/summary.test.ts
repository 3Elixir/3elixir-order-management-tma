import { test, expect } from 'vitest';
import { buildIncomeSummary } from './summary';
import { readIncomeSummary, readAdjustments } from './readers';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IncomeSummaryTab, AdjustmentData } from './schema';

const ZERO_TAB: IncomeSummaryTab = {
  totalRevenue: 0, shippingSubtotal: 0, amsCommission: 0, commission: 0,
  serviceFee: 0, saverProgramFee: 0, transactionFee: 0, productGst: 0,
  shippingGst: 0, adsEscrow: 0, totalExpenses: 0, totalReleased: 0,
};
const ZERO_ADJ: AdjustmentData = { total: 0, items: [] };

test('buildIncomeSummary returns zeros for empty input', () => {
  // All fields in the current SummaryRow (minus totalOrderAmount, added by pipeline)
  expect(buildIncomeSummary([], ZERO_TAB, ZERO_ADJ)).toEqual({
    totalReleased: 0,
    commissionFee: 0,
    transactionFee: 0,
    totalShippingFee: 0,
    vouchersAndRebates: 0,
    serviceFee: 0,
    adjustments: 0,
    actualReleased: 0,
    totalExpenses: 0,
  });
});

test('buildIncomeSummary uses Summary-tab values for fees + adjustments (inputs/Income.xlsx)', async () => {
  // Authoritative values come from the Summary tab and Adjustment tab of the real fixture.
  // inputs/Income.xlsx is the Jun 2025 income export used by the original test suite.
  // The parity fixture Output_Updated.xlsx only carried 4 columns and predates the
  // Summary-tab reconciliation approach, so we assert against the fixture itself.
  const b = readFileSync(join(__dirname, '__tests__/fixtures/inputs/Income.xlsx'));
  const tab = await readIncomeSummary(b);
  const adj = await readAdjustments(b);

  // Pass empty income rows — the summary fields that come from income rows
  // (totalReleased, vouchersAndRebates) will be 0; we assert the tab-derived fields.
  const out = buildIncomeSummary([], tab, adj);

  // From Summary tab: Commission fee (Incl. GST)
  expect(out.commissionFee).toBeCloseTo(-2815.77, 2);
  // From Summary tab: Transaction Fee (Incl. Gst)
  expect(out.transactionFee).toBeCloseTo(-1210.31, 2);
  // From Summary tab: Shipping Subtotal
  expect(out.totalShippingFee).toBeCloseTo(-602.24, 2);
  // From Summary tab: Service Fee (incl. GST) — 0 for this month
  expect(out.serviceFee).toBeCloseTo(0, 2);
  // From Summary tab: 2. Total Expenses
  expect(out.totalExpenses).toBeCloseTo(-4628.32, 2);
  // From Adjustment tab: Total Amount
  expect(out.adjustments).toBeCloseTo(185.27, 2);
  // actualReleased = Summary-tab totalReleased + adjustments = 32274.54 + 185.27
  expect(out.actualReleased).toBeCloseTo(32459.81, 2);
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
