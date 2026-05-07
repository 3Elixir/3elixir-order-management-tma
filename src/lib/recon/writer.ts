import ExcelJS from 'exceljs';
import type { CompiledRow, SummaryRow, ProductBreakdownRow } from './schema';

type SheetSpec = {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
};

function addSheet(wb: ExcelJS.Workbook, spec: SheetSpec): void {
  const ws = wb.addWorksheet(spec.name);
  ws.addRow(spec.headers);
  for (const r of spec.rows) ws.addRow(r);
  ws.getRow(1).font = { bold: true };
  // Compute column widths: max(header, max cell length) + 2
  ws.columns = spec.headers.map((h, i) => {
    let max = h.length;
    for (const r of spec.rows) {
      const v = r[i];
      const len = v == null ? 0 : String(v).length;
      if (len > max) max = len;
    }
    return { header: h, width: max + 2 };
  });
  // Format numeric cells to 2 decimal places
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum === 1) return;
    row.eachCell((cell) => {
      if (typeof cell.value === 'number') cell.numFmt = '0.00';
    });
  });
}

export async function writeWorkbook(input: {
  compiled: CompiledRow[];
  breakdown: ProductBreakdownRow[];
  summary: SummaryRow;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  addSheet(wb, {
    name: 'Income Compiled',
    headers: ['SKU Reference No.', 'Order ID', 'Product Name', 'Quantity', 'Total Order Amount'],
    rows: input.compiled.map((r) => [r.sku, r.orderId, r.productName, r.quantity, r.totalOrderAmount]),
  });
  addSheet(wb, {
    name: 'Product Breakdown',
    headers: [
      'SKU Reference No.',
      'Total Quantity',
      'Revenue per Unit',
      'Net Revenue',
      'Total Fees',
      'Total Order Amount',
    ],
    rows: input.breakdown.map((r) => [
      r.sku,
      r.totalQuantity,
      r.revenuePerUnit,
      r.netRevenue,
      r.totalFees,
      r.totalOrderAmount,
    ]),
  });
  addSheet(wb, {
    name: 'Income Summary',
    headers: [
      'Total Order Amount',
      'Total Released Amount (S$)',
      'Commission fee (Incl. GST)',
      'Transaction Fee (Incl. Gst)',
      'Total Shipping Fee',
    ],
    rows: [[
      input.summary.totalOrderAmount,
      input.summary.totalReleased,
      input.summary.commissionFee,
      input.summary.transactionFee,
      input.summary.totalShippingFee,
    ]],
  });
  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr);
}
