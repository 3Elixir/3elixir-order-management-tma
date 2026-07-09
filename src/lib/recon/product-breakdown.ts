import type { OrderRow, IncomeRow, MergedRow, ProductBreakdownRow } from './schema';

type BreakdownInput = Pick<OrderRow, 'orderId' | 'sku' | 'quantity' | 'totalOrderAmount'> &
  Pick<IncomeRow, 'productName' | 'commissionFee' | 'transactionFee' | 'totalShippingFee' | 'serviceFee'>;

export function buildProductBreakdown(rows: BreakdownInput[], unmatchedRows: MergedRow[] = []): ProductBreakdownRow[] {
  // Dedupe by (orderId, sku) — mirrors pivot table dedup logic
  const seen = new Set<string>();
  const deduped: BreakdownInput[] = [];
  for (const r of rows) {
    const k = `${r.orderId}\u0000${r.sku}`;
    if (!seen.has(k)) {
      seen.add(k);
      deduped.push(r);
    }
  }

  // Pro-rate fees across fan-out rows: one income row (orderId + productName) may match
  // multiple SKUs. Fees must be split proportionally by each SKU's share of the group's
  // total order amount so the breakdown's fee sum equals the income summary's fee sum.
  const groupTotal = new Map<string, number>();
  const groupCount = new Map<string, number>();
  for (const r of deduped) {
    const k = `${r.orderId}\u0000${r.productName}`;
    groupTotal.set(k, (groupTotal.get(k) ?? 0) + r.totalOrderAmount);
    groupCount.set(k, (groupCount.get(k) ?? 0) + 1);
  }

  // Group by SKU — accumulate quantity, revenue and pro-rated fees
  const acc = new Map<string, { totalQuantity: number; totalOrderAmount: number; totalFees: number }>();
  for (const r of deduped) {
    const gk = `${r.orderId}\u0000${r.productName}`;
    const gt = groupTotal.get(gk) ?? 0;
    const proportion = gt > 0 ? r.totalOrderAmount / gt : 1 / (groupCount.get(gk) ?? 1);
    const proratedFees = (r.commissionFee + r.transactionFee + r.totalShippingFee + r.serviceFee) * proportion;

    const cur = acc.get(r.sku) ?? { totalQuantity: 0, totalOrderAmount: 0, totalFees: 0 };
    cur.totalQuantity += r.quantity;
    cur.totalOrderAmount += r.totalOrderAmount;
    cur.totalFees += proratedFees;
    acc.set(r.sku, cur);
  }

  // Build result. Fees are stored as negative values (Shopee deducts them), so net
  // revenue = order amount + fees (adding the negatives subtracts them from revenue).
  const result: ProductBreakdownRow[] = [...acc.entries()]
    .map(([sku, v]) => ({
      sku,
      totalQuantity: v.totalQuantity,
      revenuePerUnit: v.totalQuantity > 0 ? v.totalOrderAmount / v.totalQuantity : 0,
      totalOrderAmount: v.totalOrderAmount,
      totalFees: v.totalFees,
      netRevenue: v.totalOrderAmount + v.totalFees,
    }))
    .sort((a, b) => (a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0));

  // Append fees from income rows that had no matching order (preserves parity with Income Summary)
  const unmatchedFees = unmatchedRows.reduce(
    (sum, r) => sum + r.commissionFee + r.transactionFee + r.totalShippingFee + r.serviceFee,
    0,
  );
  if (unmatchedFees !== 0) {
    result.push({
      sku: '(Unmatched)',
      totalQuantity: 0,
      revenuePerUnit: 0,
      totalOrderAmount: 0,
      totalFees: unmatchedFees,
      netRevenue: unmatchedFees,
    });
  }

  return result;
}
