import type { OrderRow, IncomeRow } from './schema';
import type { RawOrderRow, RawIncomeRow } from './readers';

export function filterCompletedOrders(rows: RawOrderRow[]): RawOrderRow[] {
  return rows.filter((r) => r.orderStatus === 'Completed');
}

export function computeOrderTotals(rows: RawOrderRow[]): OrderRow[] {
  return rows.map(({ orderStatus: _ignored, ...rest }) => ({
    ...rest,
    totalOrderAmount: rest.dealPrice * rest.quantity,
  }));
}

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function round2(n: number): number {
  const sign = n < 0 ? -1 : 1;
  return sign * Number(Math.round(Number(Math.abs(n) + 'e+2')) + 'e-2');
}

export function filterSkuView(rows: RawIncomeRow[]): RawIncomeRow[] {
  return rows.filter((r) => r.viewBy === 'Sku');
}

export function computeIncomeAggregates(rows: RawIncomeRow[]): IncomeRow[] {
  return rows.map((r) => {
    const totalShippingFee = round2(
      num(r['Shipping Fee Paid by Buyer']) +
        num(r['Shipping Fee Charged by Logistic Provider']) +
        num(r['Shipping Rebate From Shopee']) +
        num(r['Reverse Shipping Fee']) +
        num(r['Shipping Fee Saver Program Savings']) +
        num(r['Return to Seller Fee']),
    );
    const vouchersAndRebates =
      num(r['Rebate Provided by Shopee']) +
      num(r['Voucher Sponsored by Seller']) +
      num(r['Coin Cashback Sponsored by Seller']);
    const lostRaw = r['Lost Compensation'];
    const lostCompensation = lostRaw === '-' ? 0 : num(lostRaw);
    return {
      orderId: r.orderId,
      productName: r.productName,
      productPrice: num(r['Product Price']),
      refundAmount: num(r['Refund Amount']),
      totalReleased: num(r['Total Released Amount (S$)']),
      totalShippingFee,
      commissionFee: num(r['Commission fee (Incl. GST)']),
      transactionFee: num(r['Transaction Fee (Incl. Gst)']),
      vouchersAndRebates,
      lostCompensation,
    };
  });
}
