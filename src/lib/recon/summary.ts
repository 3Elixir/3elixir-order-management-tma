import type { IncomeRow, SummaryRow } from './schema';

export function buildIncomeSummary(income: IncomeRow[]): SummaryRow {
  const init: SummaryRow = {
    totalReleased: 0,
    commissionFee: 0,
    transactionFee: 0,
    totalShippingFee: 0,
  };
  return income.reduce<SummaryRow>(
    (acc, r) => ({
      totalReleased: acc.totalReleased + r.totalReleased,
      commissionFee: acc.commissionFee + r.commissionFee,
      transactionFee: acc.transactionFee + r.transactionFee,
      totalShippingFee: acc.totalShippingFee + r.totalShippingFee,
    }),
    init,
  );
}
