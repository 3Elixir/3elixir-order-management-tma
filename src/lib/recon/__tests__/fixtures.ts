import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ExcelJS from 'exceljs';

const FIXTURE_DIR = join(__dirname, 'fixtures');

export function fixtureBuffer(name: string): Buffer {
  return readFileSync(join(FIXTURE_DIR, name));
}

export async function readFixtureSheet(
  name: string,
  sheetName: string,
): Promise<Record<string, unknown>[]> {
  const wb = new ExcelJS.Workbook();
  const buf = fixtureBuffer(name);
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`fixture ${name} has no sheet ${sheetName}`);
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, col) => { headers[col - 1] = String(cell.value); });
  const rows: Record<string, unknown>[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum === 1) return;
    const obj: Record<string, unknown> = {};
    row.eachCell((cell, col) => {
      const key = headers[col - 1];
      if (key) obj[key] = cell.value;
    });
    rows.push(obj);
  });
  return rows;
}
