import { test, expect } from 'vitest';
import { runPipeline } from './pipeline';
import { fixtureBuffer } from './__tests__/fixtures';

test('runPipeline produces previews + xlsx buffer for real inputs', async () => {
  const orders = fixtureBuffer('inputs/Orders.xlsx');
  const income = fixtureBuffer('inputs/Income.xlsx');
  const result = await runPipeline(orders, income);
  expect(result.previews.compiled.length).toBeGreaterThan(0);
  expect(result.previews.pivot.length).toBeGreaterThan(0);
  expect(result.previews.summary).toHaveProperty('totalReleased');
  expect(result.unmatched).toHaveProperty('count');
  expect(result.unmatched.count).toBeGreaterThanOrEqual(0);
  expect(Buffer.isBuffer(result.workbook)).toBe(true);
  expect(result.workbook.length).toBeGreaterThan(1000); // sane size for a 3-sheet xlsx
});

test('runPipeline unmatched.sample is capped at 5', async () => {
  const orders = fixtureBuffer('inputs/Orders.xlsx');
  const income = fixtureBuffer('inputs/Income.xlsx');
  const result = await runPipeline(orders, income);
  expect(result.unmatched.sample.length).toBeLessThanOrEqual(5);
});
