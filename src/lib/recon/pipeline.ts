import { readOrders, readIncome } from './readers';
import {
  filterCompletedOrders, computeOrderTotals,
  filterSkuView, computeIncomeAggregates,
} from './transform';
import { leftJoin, unmatched } from './join';
import { buildIncomeCompiled } from './compile';
import { buildProductBreakdown } from './product-breakdown';
import { buildIncomeSummary } from './summary';
import { writeWorkbook } from './writer';
import type { CompiledRow, SummaryRow, ProductBreakdownRow, MergedRow } from './schema';

export type PipelineResult = {
  previews: { compiled: CompiledRow[]; breakdown: ProductBreakdownRow[]; summary: SummaryRow };
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
  const seen = new Set<string>();
  const combinedOrdersRaw = [...ordersRaw, ...ordersPrevRaw].filter((r) => {
    const key = `${r.orderId}\x00${r.sku}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Current month orders only vs combined orders (used for compiled/unmatched)
  // The previous month file supplements the join for unmatched income rows but must NOT
  // contribute to breakdown totals — otherwise settled carryover orders inflate them.
  const currentOrders = computeOrderTotals(filterCompletedOrders(ordersRaw));
  const orders = computeOrderTotals(filterCompletedOrders(combinedOrdersRaw));
  const income = computeIncomeAggregates(filterSkuView(incomeRaw));
  const merged = leftJoin(income, orders);
  const unmatchedRows = unmatched(merged);
  const compiled = buildIncomeCompiled(merged);
  // Build breakdown from income × current-month orders only (mirrors Python Merged_DF).
  // Using combined orders here would include previous-month carryover orders that appear
  // in the income file, doubling the totals.
  const mergedCurrentOnly = leftJoin(income, currentOrders);
  const pivotInput = mergedCurrentOnly.filter(
    (r): r is typeof r & Required<Pick<typeof r, 'sku' | 'quantity' | 'totalOrderAmount'>> =>
      r.sku != null && r.quantity != null && r.totalOrderAmount != null,
  );
  const unmatchedIncomeRows = mergedCurrentOnly.filter((r) => r.sku == null);
  const breakdown = buildProductBreakdown(pivotInput, unmatchedIncomeRows);
  const totalOrderAmount = compiled.reduce((sum, r) => sum + r.totalOrderAmount, 0);
  const summary = { ...buildIncomeSummary(income), totalOrderAmount };
  const workbook = await writeWorkbook({ compiled, breakdown, summary });
  return {
    previews: { compiled, breakdown, summary },
    unmatched: { count: unmatchedRows.length, sample: unmatchedRows.slice(0, 5) },
    workbook,
  };
}
