import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
import formidable, { type File as FormidableFile } from "formidable";
import { runPipeline } from "~/lib/recon/pipeline";
import { SchemaError, ParseError, PipelineError } from "~/lib/recon/errors";
import { put as putDownload } from "~/lib/recon/downloadStore";
import { generateReconId, outputFilename } from "~/lib/recon/reconId";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

function pickFile(
  field: FormidableFile | FormidableFile[] | undefined,
): FormidableFile | null {
  if (!field) return null;
  if (Array.isArray(field)) return field[0] ?? null;
  return field;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ kind: "parse", message: "Method Not Allowed" });
  }

  const form = formidable({
    multiples: false,
    maxFiles: 3,
    maxFileSize: 5 * 1024 * 1024,
    allowEmptyFiles: false,
  });

  let ordersFile: FormidableFile | null = null;
  let ordersPrevFile: FormidableFile | null = null;
  let incomeFile: FormidableFile | null = null;

  try {
    const [, files] = await form.parse(req);
    ordersFile = pickFile(files.orders);
    ordersPrevFile = pickFile(files.ordersPrev);
    incomeFile = pickFile(files.income);
  } catch (err) {
    return res.status(400).json({
      kind: "parse",
      message: `Could not parse multipart form: ${(err as Error).message}`,
    });
  }

  if (!ordersFile || !ordersPrevFile || !incomeFile) {
    return res.status(400).json({
      kind: "parse",
      message: '"orders", "ordersPrev", and "income" file fields are all required.',
    });
  }

  let ordersBuf: Buffer;
  let ordersPrevBuf: Buffer;
  let incomeBuf: Buffer;
  try {
    [ordersBuf, ordersPrevBuf, incomeBuf] = await Promise.all([
      fs.readFile(ordersFile.filepath),
      fs.readFile(ordersPrevFile.filepath),
      fs.readFile(incomeFile.filepath),
    ]);
  } catch (err) {
    return res.status(400).json({
      kind: "parse",
      message: `Could not read uploaded files: ${(err as Error).message}`,
    });
  } finally {
    await Promise.all([
      ordersFile?.filepath
        ? fs.unlink(ordersFile.filepath).catch(() => undefined)
        : Promise.resolve(),
      ordersPrevFile?.filepath
        ? fs.unlink(ordersPrevFile.filepath).catch(() => undefined)
        : Promise.resolve(),
      incomeFile?.filepath
        ? fs.unlink(incomeFile.filepath).catch(() => undefined)
        : Promise.resolve(),
    ]);
  }

  try {
    const result = await runPipeline(ordersBuf, ordersPrevBuf, incomeBuf);
    const reconId = generateReconId();
    putDownload(reconId, {
      workbook: result.workbook,
      previews: result.previews,
      unmatched: result.unmatched,
    });
    const { compiled, breakdown, summary } = result.previews;
    const summaryStats = {
      totalReleased: summary.totalReleased,
      commissionFee: summary.commissionFee,
      transactionFee: summary.transactionFee,
      totalShippingFee: summary.totalShippingFee,
      uniqueOrders: new Set(compiled.map((r) => r.orderId).filter(Boolean)).size,
      skuCount: breakdown.length,
      compiledRows: compiled.length,
      unmatchedCount: result.unmatched.count,
    };
    return res.status(200).json({
      reconId,
      previews: result.previews,
      unmatched: result.unmatched,
      workbookB64: result.workbook.toString('base64'),
      summaryStats,
      download: {
        id: reconId,
        url: `/api/shopee-recon/download/${reconId}`,
        filename: outputFilename(reconId),
      },
    });
  } catch (err) {
    if (err instanceof SchemaError) {
      return res
        .status(400)
        .json({ kind: "schema", sheet: err.sheet, missing: err.missing });
    }
    if (err instanceof ParseError) {
      return res.status(400).json({ kind: "parse", message: err.message });
    }
    if (err instanceof PipelineError) {
      return res.status(500).json({ kind: "pipeline", message: err.message });
    }
    return res.status(500).json({
      kind: "pipeline",
      message: (err as Error).message ?? "Unknown error",
    });
  }
}
