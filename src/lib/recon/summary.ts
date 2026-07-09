import type { IncomeRow, SummaryRow, IncomeSummaryTab, AdjustmentData } from './schema';

export function buildIncomeSummary(
  income: IncomeRow[],
  tab: IncomeSummaryTab,
  adjustment: AdjustmentData,
): Omit<SummaryRow, 'totalOrderAmount'> {
  const releasedFromRows = income.reduce((s, r) => s + r.totalReleased, 0);
  return {
    totalReleased: releasedFromRows,
    commissionFee: tab.commission,
    transactionFee: tab.transactionFee,
    totalShippingFee: tab.shippingSubtotal,
    vouchersAndRebates: income.reduce((s, r) => s + r.vouchersAndRebates, 0),
    serviceFee: tab.serviceFee,
    adjustments: adjustment.total,
    actualReleased: tab.totalReleased + adjustment.total,
    totalExpenses: tab.totalExpenses,
  };
}
