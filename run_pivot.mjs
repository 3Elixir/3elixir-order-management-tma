import { readFileSync } from 'fs';
import { runPipeline } from './src/lib/recon/pipeline.ts';

const ordersBuf = readFileSync('./src/lib/recon/__tests__/fixtures/inputs/Orders.xlsx');
const incomeBuf = readFileSync('./src/lib/recon/__tests__/fixtures/inputs/Income.xlsx');

const result = await runPipeline(ordersBuf, ordersBuf, incomeBuf);

console.log('\n=== PIVOT TABLE ===');
console.log('SKU'.padEnd(30), 'Total Qty'.padStart(12), 'Total Order Amt (SGD)'.padStart(22));
console.log('-'.repeat(66));
let grandQty = 0, grandAmt = 0;
for (const row of result.previews.pivot) {
  console.log(row.sku.padEnd(30), String(row.totalQuantity).padStart(12), row.totalOrderAmount.toFixed(2).padStart(22));
  grandQty += row.totalQuantity;
  grandAmt += row.totalOrderAmount;
}
console.log('-'.repeat(66));
console.log('TOTAL'.padEnd(30), String(grandQty).padStart(12), grandAmt.toFixed(2).padStart(22));
