import type { IncomeRow, SummaryRow } from './schema';

type IncomeSummary = Omit<SummaryRow, 'totalOrderAmount'>;

export function buildIncomeSummary(income: IncomeRow[]): IncomeSummary {
  const init: IncomeSummary = {
    totalReleased: 0,
    commissionFee: 0,
    transactionFee: 0,
    totalShippingFee: 0,
    vouchersAndRebates: 0,
  };
  return income.reduce<IncomeSummary>(
    (acc, r) => ({
      totalReleased: acc.totalReleased + r.totalReleased,
      commissionFee: acc.commissionFee + r.commissionFee,
      transactionFee: acc.transactionFee + r.transactionFee,
      totalShippingFee: acc.totalShippingFee + r.totalShippingFee,
      vouchersAndRebates: acc.vouchersAndRebates + r.vouchersAndRebates,
    }),
    init,
  );
}
