import type { OrderRow, IncomeRow, MergedRow, ProductBreakdownRow } from './schema';

type BreakdownInput = Pick<OrderRow, 'orderId' | 'sku' | 'quantity' | 'totalOrderAmount'> &
  Pick<IncomeRow, 'commissionFee' | 'transactionFee' | 'totalShippingFee'>;

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

  // Group by SKU — accumulate quantity, revenue and fees
  const acc = new Map<string, { totalQuantity: number; totalOrderAmount: number; totalFees: number }>();
  for (const r of deduped) {
    const cur = acc.get(r.sku) ?? { totalQuantity: 0, totalOrderAmount: 0, totalFees: 0 };
    cur.totalQuantity += r.quantity;
    cur.totalOrderAmount += r.totalOrderAmount;
    cur.totalFees += r.commissionFee + r.transactionFee + r.totalShippingFee;
    acc.set(r.sku, cur);
  }

  // Build result: (sku quantity * revenue per unit) - total fees
  const result: ProductBreakdownRow[] = [...acc.entries()]
    .map(([sku, v]) => ({
      sku,
      totalQuantity: v.totalQuantity,
      revenuePerUnit: v.totalQuantity > 0 ? v.totalOrderAmount / v.totalQuantity : 0,
      totalOrderAmount: v.totalOrderAmount,
      totalFees: v.totalFees,
      netRevenue: v.totalOrderAmount - v.totalFees,
    }))
    .sort((a, b) => (a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0));

  // Append fees from income rows that had no matching order (preserves parity with Income Summary)
  const unmatchedFees = unmatchedRows.reduce(
    (sum, r) => sum + r.commissionFee + r.transactionFee + r.totalShippingFee,
    0,
  );
  if (unmatchedFees !== 0) {
    result.push({
      sku: '(Unmatched)',
      totalQuantity: 0,
      revenuePerUnit: 0,
      totalOrderAmount: 0,
      totalFees: unmatchedFees,
      netRevenue: -unmatchedFees,
    });
  }

  return result;
}
