import type { OrderRow, IncomeRow, MergedRow } from './schema';

const key = (orderId: string, productName: string) => `${orderId}\u0000${productName}`;

export function leftJoin(income: IncomeRow[], orders: OrderRow[]): MergedRow[] {
  // Build a multimap: each key may have multiple order rows (Polars left-join fans out on duplicates)
  const map = new Map<string, OrderRow[]>();
  for (const o of orders) {
    const k = key(o.orderId, o.productName);
    const existing = map.get(k);
    if (existing) {
      existing.push(o);
    } else {
      map.set(k, [o]);
    }
  }
  const result: MergedRow[] = [];
  for (const i of income) {
    const matches = map.get(key(i.orderId, i.productName));
    if (!matches || matches.length === 0) {
      result.push({ ...i });
    } else {
      for (const o of matches) {
        result.push({
          ...i,
          sku: o.sku,
          quantity: o.quantity,
          totalOrderAmount: o.totalOrderAmount,
        });
      }
    }
  }
  return result;
}

export function unmatched(merged: MergedRow[]): MergedRow[] {
  return merged.filter((r) => r.sku == null);
}
