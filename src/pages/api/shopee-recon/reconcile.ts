import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
import formidable, { type File as FormidableFile } from "formidable";
import { randomUUID } from "crypto";
import { runPipeline } from "~/lib/recon/pipeline";
import { SchemaError, ParseError, PipelineError } from "~/lib/recon/errors";
import { put as putDownload } from "~/lib/recon/downloadStore";

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
    maxFiles: 2,
    maxFileSize: 5 * 1024 * 1024,
    allowEmptyFiles: false,
  });

  let ordersFile: FormidableFile | null = null;
  let incomeFile: FormidableFile | null = null;

  try {
    const [, files] = await form.parse(req);
    ordersFile = pickFile(files.orders);
    incomeFile = pickFile(files.income);
  } catch (err) {
    return res.status(400).json({
      kind: "parse",
      message: `Could not parse multipart form: ${(err as Error).message}`,
    });
  }

  if (!ordersFile || !incomeFile) {
    return res.status(400).json({
      kind: "parse",
      message: 'Both "orders" and "income" file fields are required.',
    });
  }

  let ordersBuf: Buffer;
  let incomeBuf: Buffer;
  try {
    ordersBuf = await fs.readFile(ordersFile.filepath);
    incomeBuf = await fs.readFile(incomeFile.filepath);
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
      incomeFile?.filepath
        ? fs.unlink(incomeFile.filepath).catch(() => undefined)
        : Promise.resolve(),
    ]);
  }

  try {
    const result = await runPipeline(ordersBuf, incomeBuf);
    const downloadId = randomUUID();
    putDownload(downloadId, result.workbook);
    return res.status(200).json({
      previews: result.previews,
      unmatched: result.unmatched,
      download: {
        id: downloadId,
        url: `/api/shopee-recon/download/${downloadId}`,
        filename: "Output_Updated.xlsx",
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
