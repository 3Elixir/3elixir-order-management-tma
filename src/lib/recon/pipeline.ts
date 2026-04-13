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

export async function runPipeline(ordersBuf: Buffer, incomeBuf: Buffer): Promise<PipelineResult> {
  const ordersRaw = await readOrders(ordersBuf);
  const incomeRaw = await readIncome(incomeBuf);
  const orders = computeOrderTotals(filterCompletedOrders(ordersRaw));
  const income = computeIncomeAggregates(filterSkuView(incomeRaw));
  const merged = leftJoin(income, orders);
  const unmatchedRows = unmatched(merged);
  const compiled = buildIncomeCompiled(merged);
  const pivot = buildPivotTable(orders);
  const summary = buildIncomeSummary(income);
  const workbook = await writeWorkbook({ compiled, pivot, summary });
  return {
    previews: { compiled, pivot, summary },
    unmatched: { count: unmatchedRows.length, sample: unmatchedRows.slice(0, 5) },
    workbook,
  };
}
