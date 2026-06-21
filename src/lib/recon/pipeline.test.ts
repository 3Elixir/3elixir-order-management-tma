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
  expect(result.unmatched).toHaveProperty('count');
  expect(result.unmatched.count).toBeGreaterThanOrEqual(0);
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
