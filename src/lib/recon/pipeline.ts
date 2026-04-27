import { readOrders, readIncome } from './readers';
import {
  filterCompletedOrders, computeOrderTotals,
  filterSkuView, computeIncomeAggregates,
} from './transform';
import { leftJoin, unmatched } from './join';
import { buildIncomeCompiled } from './compile';
import { buildPivotTable } from './pivot';
import { buildIncomeSummary } from './summary';
import { writeWorkbook } from './writer';
import type { CompiledRow, PivotRow, SummaryRow, MergedRow } from './schema';

export type PipelineResult = {
  previews: { compiled: CompiledRow[]; pivot: PivotRow[]; summary: SummaryRow };
  unmatched: { count: number; sample: MergedRow[] };
  workbook: Buffer;
};

export async function runPipeline(ordersBuf: Buffer, ordersPrevBuf: Buffer, incomeBuf: Buffer): Promise<PipelineResult> {
  const [ordersRaw, ordersPrevRaw, incomeRaw] = await Promise.all([
    readOrders(ordersBuf),
    readOrders(ordersPrevBuf),
    readIncome(incomeBuf),
  ]);

  // Combine current + previous month orders, deduplicate on orderId + sku
  // (matches the dedup key used in buildPivotTable to prevent double-counting)
  const seen = new Set<string>();
  const combinedOrdersRaw = [...ordersRaw, ...ordersPrevRaw].filter((r) => {
    const key = `${r.orderId}\x00${r.sku}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Current month orders only (used for pivot) vs combined orders (used for compiled/unmatched)
  // The previous month file supplements the join for unmatched income rows but must NOT
  // contribute to the pivot — otherwise settled carryover orders inflate the totals.
  const currentOrders = computeOrderTotals(filterCompletedOrders(ordersRaw));
  const orders = computeOrderTotals(filterCompletedOrders(combinedOrdersRaw));
  const income = computeIncomeAggregates(filterSkuView(incomeRaw));
  const merged = leftJoin(income, orders);
  const unmatchedRows = unmatched(merged);
  const compiled = buildIncomeCompiled(merged);
  // Build pivot from income × current-month orders only (mirrors Python Merged_DF).
  // Using combined orders here would include previous-month carryover orders that appear
  // in the income file, doubling the pivot totals.
  const mergedCurrentOnly = leftJoin(income, currentOrders);
  const pivotInput = mergedCurrentOnly.filter(
    (r): r is typeof r & Required<Pick<typeof r, 'sku' | 'quantity' | 'totalOrderAmount'>> =>
      r.sku != null && r.quantity != null && r.totalOrderAmount != null,
  );
  const pivot = buildPivotTable(pivotInput);
  const totalOrderAmount = compiled.reduce((sum, r) => sum + r.totalOrderAmount, 0);
  const summary = { ...buildIncomeSummary(income), totalOrderAmount };
  const workbook = await writeWorkbook({ compiled, pivot, summary });
  return {
    previews: { compiled, pivot, summary },
    unmatched: { count: unmatchedRows.length, sample: unmatchedRows.slice(0, 5) },
    workbook,
  };
}
