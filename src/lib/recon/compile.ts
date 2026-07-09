import type { MergedRow, CompiledRow, AdjustmentData } from './schema';
import { SYNTHETIC_SKUS } from './schema';
import { PipelineError } from './errors';

function round2(n: number): number {
  const sign = n < 0 ? -1 : 1;
  return sign * Number(Math.round(Number(Math.abs(n) + 'e+2')) + 'e-2');
}

const isSynthetic: ReadonlySet<string> = new Set<string>(SYNTHETIC_SKUS);

export function productRows(merged: MergedRow[]): CompiledRow[] {
  return merged.map((r) => {
    const sku = r.sku ?? '';
    if (isSynthetic.has(sku)) {
      throw new PipelineError(
        `Real SKU "${sku}" collides with reserved synthetic row code (${[...SYNTHETIC_SKUS].join(', ')}). Rename the SKU in your Orders export.`,
      );
    }
    return {
      sku,
      orderId: r.orderId,
      productName: r.productName,
      quantity: r.quantity ?? null,
      totalOrderAmount: round2(r.productPrice),
    };
  });
}

function groupSumByOrder(
  rows: MergedRow[],
  field: keyof MergedRow,
): Map<string, number> {
  const acc = new Map<string, number>();
  for (const r of rows) {
    const v = r[field] as unknown as number;
    acc.set(r.orderId, (acc.get(r.orderId) ?? 0) + v);
  }
  return acc;
}

export function refundRows(merged: MergedRow[]): CompiledRow[] {
  const filtered = merged.filter((r) => r.refundAmount !== 0);
  const sums = groupSumByOrder(filtered, 'refundAmount');
  return [...sums.entries()].map(([orderId, total]) => ({
    sku: 'RF', orderId, productName: 'Refund', quantity: null,
    totalOrderAmount: round2(total),
  }));
}

export function lostCompRows(merged: MergedRow[]): CompiledRow[] {
  return merged
    .filter((r) => r.lostCompensation !== 0)
    .map((r) => ({
      sku: 'LC', orderId: r.orderId, productName: 'Lost Compensation',
      quantity: null, totalOrderAmount: round2(r.lostCompensation),
    }));
}

function aggregateByOrder(
  merged: MergedRow[],
  field: keyof MergedRow,
  sku: string,
  productName: string,
): CompiledRow[] {
  const sums = groupSumByOrder(merged, field);
  return [...sums.entries()].map(([orderId, total]) => ({
    sku, orderId, productName, quantity: null, totalOrderAmount: round2(total),
  }));
}

export function txnFeeRows(merged: MergedRow[]): CompiledRow[] {
  return aggregateByOrder(merged, 'transactionFee', 'TF', 'Transaction Fee');
}

export function commissionRows(merged: MergedRow[]): CompiledRow[] {
  return aggregateByOrder(merged, 'commissionFee', 'CF', 'Commission Fee');
}

export function shippingRows(merged: MergedRow[]): CompiledRow[] {
  return aggregateByOrder(merged, 'totalShippingFee', 'SF', 'Shipping Fee');
}

export function vouchersAndRebatesRows(merged: MergedRow[]): CompiledRow[] {
  return aggregateByOrder(merged, 'vouchersAndRebates', 'VR', 'Vouchers & Rebates');
}

export function serviceFeeRows(merged: MergedRow[]): CompiledRow[] {
  return aggregateByOrder(merged, 'serviceFee', 'SC', 'Service Fee');
}

// Refund Timing (RT): when a refund this month is for a sale released in a PRIOR
// month, the income file shows the gross refund but Total Released = 0 (or partial).
// The gross RF row over-subtracts, so per-refunded-order we add an RT row carrying
// the prior-period offset = Total Released − sum(all other income components). This
// ties each refunded order to its actual Total Released. Only refunded orders get an
// RT row; non-refunded orders' sub-cent rounding stays in the unattributed remainder.
export function refundTimingRows(merged: MergedRow[]): CompiledRow[] {
  const refundedOrders = new Set<string>();
  for (const r of merged) {
    if (r.refundAmount !== 0) refundedOrders.add(r.orderId);
  }
  const residual = new Map<string, number>();
  for (const r of merged) {
    if (!refundedOrders.has(r.orderId)) continue;
    const components =
      r.productPrice + r.refundAmount + r.totalShippingFee + r.commissionFee +
      r.transactionFee + r.vouchersAndRebates + r.lostCompensation + r.serviceFee;
    residual.set(r.orderId, (residual.get(r.orderId) ?? 0) + (r.totalReleased - components));
  }
  const out: CompiledRow[] = [];
  for (const [orderId, total] of residual) {
    const amount = round2(total);
    if (amount === 0) continue;
    out.push({ sku: 'RT', orderId, productName: 'Refund Timing', quantity: null, totalOrderAmount: amount });
  }
  return out;
}

export function adjustmentRows(adjustment: AdjustmentData): CompiledRow[] {
  return adjustment.items
    .filter((i) => i.amount !== 0)
    .map((i) => ({
      sku: 'AJ', orderId: i.orderId, productName: 'Adjustment',
      quantity: null, totalOrderAmount: round2(i.amount),
    }));
}

export function buildIncomeCompiled(merged: MergedRow[], adjustment: AdjustmentData = { total: 0, items: [] }): CompiledRow[] {
  const all = [
    ...productRows(merged),
    ...refundRows(merged),
    ...lostCompRows(merged),
    ...txnFeeRows(merged),
    ...commissionRows(merged),
    ...shippingRows(merged),
    ...vouchersAndRebatesRows(merged),
    ...serviceFeeRows(merged),
    ...refundTimingRows(merged),
    ...adjustmentRows(adjustment),
  ];
  // Stable sort by orderId. Array.prototype.sort is stable in ES2019+.
  return all.sort((a, b) => (a.orderId < b.orderId ? -1 : a.orderId > b.orderId ? 1 : 0));
}
