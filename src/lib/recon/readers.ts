import ExcelJS from 'exceljs';
import { ORDERS_REQUIRED, INCOME_REQUIRED } from './schema';
import type { IncomeSummaryTab } from './schema';
import { SchemaError, ParseError } from './errors';

export type RawOrderRow = {
  orderId: string;
  productName: string;
  sku: string;
  dealPrice: number;
  quantity: number;
  orderStatus: string;
};

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  try {
    // Cast to ArrayBuffer to avoid Buffer<ArrayBufferLike> vs Buffer typing mismatch
    await wb.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
  } catch (err) {
    throw new ParseError(`Could not read XLSX: ${(err as Error).message}`);
  }
  return wb;
}

function readHeaderRow(ws: ExcelJS.Worksheet, headerRowIndex: number): string[] {
  const row = ws.getRow(headerRowIndex);
  const headers: string[] = [];
  row.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? '').trim();
  });
  return headers;
}

function checkRequired(sheet: string, headers: string[], required: readonly string[]): void {
  const set = new Set(headers);
  const missing = required.filter((c) => !set.has(c));
  if (missing.length > 0) throw new SchemaError(sheet, missing);
}

function cellNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && 'result' in (v as object)) {
    return Number((v as { result: unknown }).result);
  }
  return Number(v);
}

function cellString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && 'text' in (v as object)) {
    return String((v as { text: string }).text);
  }
  return String(v);
}

export type RawIncomeRow = Record<string, unknown> & {
  viewBy: string;
  orderId: string;
  productName: string;
};

export async function readIncome(buffer: Buffer): Promise<RawIncomeRow[]> {
  const wb = await loadWorkbook(buffer);
  const ws = wb.getWorksheet('Income');
  if (!ws) throw new ParseError('Income file is missing the "Income" sheet.');
  // Shopee export has two prelude rows; real header is row 3 (1-indexed)
  const HEADER_ROW = 3;
  const headers = readHeaderRow(ws, HEADER_ROW);
  checkRequired('Income', headers, INCOME_REQUIRED);
  const out: RawIncomeRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum <= HEADER_ROW) return;
    const obj: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const key = headers[col - 1];
      if (!key) return;
      obj[key] = cell.value;
    });
    obj.viewBy = cellString(obj['View By']);
    obj.orderId = cellString(obj['Order ID']);
    obj.productName = cellString(obj['Product Name']);
    out.push(obj as RawIncomeRow);
  });
  return out;
}

export async function readOrders(buffer: Buffer): Promise<RawOrderRow[]> {
  const wb = await loadWorkbook(buffer);
  const ws = wb.getWorksheet('orders');
  if (!ws) throw new ParseError('Orders file is missing the "orders" sheet.');
  const headers = readHeaderRow(ws, 1);
  checkRequired('orders', headers, ORDERS_REQUIRED);
  const colOf = (name: string) => headers.indexOf(name) + 1;
  const out: RawOrderRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum === 1) return;
    out.push({
      orderId: cellString(row.getCell(colOf('Order ID')).value),
      productName: cellString(row.getCell(colOf('Product Name')).value),
      sku: cellString(row.getCell(colOf('SKU Reference No.')).value),
      dealPrice: cellNumber(row.getCell(colOf('Deal Price')).value),
      quantity: cellNumber(row.getCell(colOf('Quantity')).value),
      orderStatus: cellString(row.getCell(colOf('Order Status')).value),
    });
  });
  return out;
}

// Read the last numeric cell in a row (Summary section-total values sit in the rightmost column).
function lastNumberInRow(row: ExcelJS.Row): number {
  let val = 0;
  row.eachCell({ includeEmpty: false }, (cell) => {
    const n = cellNumber(cell.value);
    if (!Number.isNaN(n) && typeof n === 'number' && n !== 0) val = n;
  });
  return val;
}

export async function readIncomeSummary(buffer: Buffer): Promise<IncomeSummaryTab> {
  const wb = await loadWorkbook(buffer);
  const ws = wb.getWorksheet('Summary');
  if (!ws) throw new ParseError('Income file is missing the "Summary" sheet.');

  const out: Record<keyof IncomeSummaryTab, number> = {
    totalRevenue: 0, shippingSubtotal: 0, amsCommission: 0, commission: 0,
    serviceFee: 0, saverProgramFee: 0, transactionFee: 0, productGst: 0,
    shippingGst: 0, adsEscrow: 0, totalExpenses: 0, totalReleased: 0,
  };

  // Section totals: label in col A (col 1), value in col D (col 4).
  const COL1_LABELS: [string, keyof IncomeSummaryTab][] = [
    ['1. Total Revenue', 'totalRevenue'],
    ['Shipping Subtotal', 'shippingSubtotal'],
    ['2. Total Expenses', 'totalExpenses'],
    ['3. Total Released Amount', 'totalReleased'],
  ];
  // Sub-item line items: label in col B (col 2), value in col C (col 3).
  const COL2_LABELS: [string, keyof IncomeSummaryTab][] = [
    ['AMS Commission Fee', 'amsCommission'],
    ['Commission fee (Incl. GST)', 'commission'],
    ['Service Fee (incl. GST)', 'serviceFee'],
    ['Shipping Fee Saver Program Fee', 'saverProgramFee'],
    ['Transaction Fee (Incl. Gst)', 'transactionFee'],
    ['Product Goods & Services Tax', 'productGst'],
    ['Shipping Goods & Services Tax', 'shippingGst'],
    ['Ads Escrow Top Up Fee', 'adsEscrow'],
  ];

  ws.eachRow({ includeEmpty: false }, (row) => {
    const col1 = String(row.getCell(1).value ?? '').trim();
    if (col1) {
      for (const [needle, key] of COL1_LABELS) {
        if (col1.startsWith(needle)) out[key] = lastNumberInRow(row);
      }
    }
    const col2 = String(row.getCell(2).value ?? '').trim();
    if (col2) {
      for (const [needle, key] of COL2_LABELS) {
        if (col2.startsWith(needle)) out[key] = cellNumber(row.getCell(3).value);
      }
    }
  });
  return out;
}
