import { test, expect } from 'vitest';
import { runPipeline } from './pipeline';
import { fixtureBuffer } from './__tests__/fixtures';

// Use the real income fixture (has Summary + Adjustment + Income sheets).
// For previous-month orders, we reuse the same orders file — the pipeline
// deduplicates on orderId+sku so identical rows cancel out safely.
test('runPipeline produces previews + xlsx buffer for real inputs', async () => {
  const orders = fixtureBuffer('inputs/Orders.xlsx');
  const ordersPrev = fixtureBuffer('inputs/Orders.xlsx');
  const income = fixtureBuffer('inputs/Income.xlsx');
  const result = await runPipeline(orders, ordersPrev, income);
  expect(result.previews.compiled.length).toBeGreaterThan(0);
  expect(result.previews.breakdown.length).toBeGreaterThan(0);
  expect(result.previews.summary).toHaveProperty('totalReleased');
  // actualReleased is deterministic for this fixture: tab.totalReleased + adjustment.total
  // = 32274.54 + 185.27 = 32459.81 (matches summary.test.ts for the same Income.xlsx fixture).
  expect(result.reconciliation.actualReleased).toBeCloseTo(32459.81, 2);
  expect(result.unmatched).toHaveProperty('count');
  // Unmatched count is a concrete value for this fixture (same orders file used for both
  // current and prev, so deduplication is maximal but unmatched income rows remain).
  expect(result.unmatched.count).toBe(33);
  expect(Buffer.isBuffer(result.workbook)).toBe(true);
  expect(result.workbook.length).toBeGreaterThan(1000); // sane size for a 3-sheet xlsx
});

test('runPipeline unmatched.sample is capped at 5', async () => {
  const orders = fixtureBuffer('inputs/Orders.xlsx');
  const ordersPrev = fixtureBuffer('inputs/Orders.xlsx');
  const income = fixtureBuffer('inputs/Income.xlsx');
  const result = await runPipeline(orders, ordersPrev, income);
  expect(result.unmatched.sample.length).toBeLessThanOrEqual(5);
});
