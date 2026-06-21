import { test, expect } from 'vitest';
import {
  productRows, refundRows, lostCompRows,
  txnFeeRows, commissionRows, shippingRows,
  buildIncomeCompiled, serviceFeeRows, adjustmentRows,
} from './compile';
import type { MergedRow, CompiledRow } from './schema';
import { PipelineError } from './errors';
import { readFixtureSheet } from './__tests__/fixtures';

function m(over: Partial<MergedRow> = {}): MergedRow {
  return {
    orderId: 'O1', productName: 'P1', productPrice: 100, refundAmount: 0,
    totalReleased: 95, totalShippingFee: -2, commissionFee: -1, transactionFee: -1,
    vouchersAndRebates: 0, lostCompensation: 0, serviceFee: 0,
    sku: 'S1', quantity: 1, totalOrderAmount: 100, ...over,
  };
}

test('productRows uses Product Price (rounded 2dp) and Quantity from Orders', () => {
  const out = productRows([m({ productPrice: 99.005, quantity: 3 })]);
  expect(out).toEqual([{
    sku: 'S1', orderId: 'O1', productName: 'P1', quantity: 3, totalOrderAmount: 99.01,
  }]);
});

test('productRows throws PipelineError on synthetic-SKU collision', () => {
  expect(() => productRows([m({ sku: 'RF' })])).toThrow(PipelineError);
});

test('productRows passes through unmatched merged rows with empty sku', () => {
  // Income row with no order match: sku/quantity/totalOrderAmount undefined
  const row = m({ sku: undefined, quantity: undefined, totalOrderAmount: undefined });
  const out = productRows([row]);
  expect(out[0].sku).toBe('');
  expect(out[0].quantity).toBeNull();
});

test('refundRows groups by orderId, only when refund != 0, sums and rounds 2dp', () => {
  const rows = [
    m({ orderId: 'O1', refundAmount: -5.005 }),
    m({ orderId: 'O1', refundAmount: -2 }),
    m({ orderId: 'O2', refundAmount: 0 }),
    m({ orderId: 'O3', refundAmount: 1 }),
  ];
  const out = refundRows(rows);
  expect(out).toContainEqual(
    { sku: 'RF', orderId: 'O1', productName: 'Refund', quantity: null, totalOrderAmount: -7.01 },
  );
  expect(out).toContainEqual(
    { sku: 'RF', orderId: 'O3', productName: 'Refund', quantity: null, totalOrderAmount: 1 },
  );
  expect(out.find((r) => r.orderId === 'O2')).toBeUndefined();
});

test('lostCompRows: one LC row per merged row where lostCompensation != 0', () => {
  const rows = [
    m({ orderId: 'O1', lostCompensation: 0 }),
    m({ orderId: 'O2', lostCompensation: 5.005 }),
  ];
  const out = lostCompRows(rows);
  expect(out).toEqual([
    { sku: 'LC', orderId: 'O2', productName: 'Lost Compensation', quantity: null, totalOrderAmount: 5.01 },
  ]);
});

test('txnFeeRows / commissionRows / shippingRows group by orderId, no filter, sum + round 2dp', () => {
  const rows = [
    m({ orderId: 'O1', transactionFee: -1, commissionFee: -2, totalShippingFee: -3 }),
    m({ orderId: 'O1', transactionFee: -0.5, commissionFee: -1, totalShippingFee: -1 }),
    m({ orderId: 'O2', transactionFee: 0, commissionFee: 0, totalShippingFee: 0 }),
  ];
  const tf = txnFeeRows(rows);
  expect(tf).toContainEqual({ sku: 'TF', orderId: 'O1', productName: 'Transaction Fee', quantity: null, totalOrderAmount: -1.5 });
  expect(tf).toContainEqual({ sku: 'TF', orderId: 'O2', productName: 'Transaction Fee', quantity: null, totalOrderAmount: 0 });
  const cf = commissionRows(rows);
  expect(cf).toContainEqual({ sku: 'CF', orderId: 'O1', productName: 'Commission Fee', quantity: null, totalOrderAmount: -3 });
  expect(cf).toContainEqual({ sku: 'CF', orderId: 'O2', productName: 'Commission Fee', quantity: null, totalOrderAmount: 0 });
  const sf = shippingRows(rows);
  expect(sf).toContainEqual({ sku: 'SF', orderId: 'O1', productName: 'Shipping Fee', quantity: null, totalOrderAmount: -4 });
  expect(sf).toContainEqual({ sku: 'SF', orderId: 'O2', productName: 'Shipping Fee', quantity: null, totalOrderAmount: 0 });
});

test('serviceFeeRows groups service fee by order with SC code', () => {
  const rows = [
    m({ orderId: 'O1', serviceFee: -10 }),
    m({ orderId: 'O1', serviceFee: -5 }),
    m({ orderId: 'O2', serviceFee: 0 }),
  ];
  const out = serviceFeeRows(rows);
  expect(out).toContainEqual({ sku: 'SC', orderId: 'O1', productName: 'Service Fee', quantity: null, totalOrderAmount: -15 });
});

test('adjustmentRows emit AJ rows keyed by linked order', () => {
  const out = adjustmentRows({ total: 41.2, items: [{ orderId: '260118C5TTYEX3', amount: 41.2 }] });
  expect(out).toEqual([
    { sku: 'AJ', orderId: '260118C5TTYEX3', productName: 'Adjustment', quantity: null, totalOrderAmount: 41.2 },
  ]);
});

function asNum(v: unknown): number {
  if (v == null) return 0;
  return Number(v);
}
function asStr(v: unknown): string {
  if (v == null) return '';
  return String(v);
}
function asNullableNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  return Number(v);
}

// Approach (a): Filter actual rows to exclude VR/SC/AJ row types before comparing to the
// pre-Task-5/6 expected fixture (Output_Updated.xlsx predates these new row types).
// This validates the unchanged core logic stays correct. A separate assertion below
// confirms SC/AJ rows ARE produced when the merged data contains service fees/adjustments,
// so the new row types are not entirely untested in this file.
test('buildIncomeCompiled matches Output_Updated.xlsx[Income Compiled] row-by-row (core rows only)', async () => {
  const mergedRaw = await readFixtureSheet('Merged_DF_Export.xlsx', 'Sheet1');
  const merged: MergedRow[] = mergedRaw.map((r) => ({
    orderId: asStr(r['Order ID']),
    productName: asStr(r['Product Name']),
    productPrice: asNum(r['Product Price']),
    refundAmount: asNum(r['Refund Amount']),
    totalReleased: asNum(r['Total Released Amount (S$)']),
    totalShippingFee: asNum(r['Total Shipping Fee']),
    commissionFee: asNum(r['Commission fee (Incl. GST)']),
    transactionFee: asNum(r['Transaction Fee (Incl. Gst)']),
    vouchersAndRebates: asNum(r['Vouchers & Rebates']),
    lostCompensation: r['Lost Compensation'] === '-' ? 0 : asNum(r['Lost Compensation']),
    // serviceFee not in old fixture — defaults to 0 (no SC rows with non-zero values)
    serviceFee: 0,
    sku: r['SKU Reference No.'] != null ? String(r['SKU Reference No.']) : undefined,
    quantity: r['Quantity'] != null ? Number(r['Quantity']) : undefined,
    totalOrderAmount: r['Total Order Amount'] != null ? Number(r['Total Order Amount']) : undefined,
  }));

  const expected: CompiledRow[] = (await readFixtureSheet('Output_Updated.xlsx', 'Income Compiled')).map((r) => ({
    sku: asStr(r['SKU Reference No.']),
    orderId: asStr(r['Order ID']),
    productName: asStr(r['Product Name']),
    quantity: asNullableNum(r['Quantity']),
    totalOrderAmount: asNum(r['Total Order Amount']),
  }));

  const NEW_ROW_TYPES = new Set(['VR', 'SC', 'AJ']);
  // Approach (a): strip VR/SC/AJ rows from actual before comparing to the old expected fixture.
  const actual = buildIncomeCompiled(merged).filter((r) => !NEW_ROW_TYPES.has(r.sku));

  expect(actual.length).toBe(expected.length);

  // Compare row-by-row with float tolerance for totalOrderAmount
  for (let i = 0; i < expected.length; i++) {
    const a = actual[i], e = expected[i];
    expect({ idx: i, sku: a.sku, orderId: a.orderId, productName: a.productName, quantity: a.quantity }).toEqual(
      { idx: i, sku: e.sku, orderId: e.orderId, productName: e.productName, quantity: e.quantity },
    );
    expect(a.totalOrderAmount).toBeCloseTo(e.totalOrderAmount, 2);
  }

  // Confirm SC rows are produced when serviceFee is non-zero (new row type validation).
  // Use one merged row with a real serviceFee value.
  const withServiceFee: MergedRow[] = [{ ...merged[0], serviceFee: -10 }];
  const scRows = buildIncomeCompiled(withServiceFee).filter((r) => r.sku === 'SC');
  expect(scRows.length).toBeGreaterThan(0);
  expect(scRows[0].totalOrderAmount).toBeCloseTo(-10, 2);

  // Confirm AJ rows are produced from adjustment data.
  const ajRows = buildIncomeCompiled([], { total: 5, items: [{ orderId: 'TEST123', amount: 5 }] })
    .filter((r) => r.sku === 'AJ');
  expect(ajRows.length).toBe(1);
  expect(ajRows[0].orderId).toBe('TEST123');
  expect(ajRows[0].totalOrderAmount).toBeCloseTo(5, 2);
});
