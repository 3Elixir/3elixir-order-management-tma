import type { OrderRow, PivotRow } from './schema';

type PivotInput = Pick<OrderRow, 'orderId' | 'sku' | 'quantity' | 'totalOrderAmount'>;

export function buildPivotTable(orders: PivotInput[]): PivotRow[] {
  // 1. Dedupe by (orderId, sku), keeping first occurrence — matches Polars unique() default
  const seen = new Set<string>();
  const deduped: OrderRow[] = [];
  for (const o of orders) {
    const k = `${o.orderId}\u0000${o.sku}`;
    if (!seen.has(k)) {
      seen.add(k);
      deduped.push(o);
    }
  }
  // 2. Group by sku — sum quantity and totalOrderAmount
  const acc = new Map<string, { totalQuantity: number; totalOrderAmount: number }>();
  for (const o of deduped) {
    const cur = acc.get(o.sku) ?? { totalQuantity: 0, totalOrderAmount: 0 };
    cur.totalQuantity += o.quantity;
    cur.totalOrderAmount += o.totalOrderAmount;
    acc.set(o.sku, cur);
  }
  // 3. Sort by sku ascending
  return [...acc.entries()]
    .map(([sku, v]) => ({ sku, ...v }))
    .sort((a, b) => (a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0));
}
