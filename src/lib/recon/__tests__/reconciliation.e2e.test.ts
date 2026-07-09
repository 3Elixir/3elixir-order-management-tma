import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runPipeline } from '../pipeline';

const FX = join(__dirname, 'fixtures');
const buf = (p: string) => readFileSync(join(FX, p));

// income month -> [current orders, previous orders]
const MONTHS: [string, string, string][] = [
  ['2025-11', 'orders/2025-11.xlsx', 'orders/2025-10.xlsx'],
  ['2025-12', 'orders/2025-12.xlsx', 'orders/2025-11.xlsx'],
  ['2026-01', 'orders/2026-01.xlsx', 'orders/2025-12.xlsx'],
  ['2026-02', 'orders/2026-02.xlsx', 'orders/2026-01.xlsx'],
  ['2026-03', 'orders/2026-03.xlsx', 'orders/2026-02.xlsx'],
];

test.each(MONTHS)('reconciliation: %s actualReleased == Summary.TotalReleased + Adjustment', async (m, cur, prev) => {
  const res = await runPipeline(buf(cur), buf(prev), buf(`income/${m}.xlsx`));
  const r = res.reconciliation;
  // Authoritative released must equal Summary + Adjustment, exact.
  // Known per-month actuals (from Shopee Summary tab + Adjustment sheet):
  const expected: Record<string, number> = {
    '2025-11': 118956.28, '2025-12': 95654.92, '2026-01': 36690.44,
    '2026-02': 36046.38, '2026-03': 31368.47,
  };
  expect(r.actualReleased).toBeCloseTo(expected[m], 2);
}, 30000);
