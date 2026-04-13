import type { NextApiRequest, NextApiResponse } from "next";
import { get as getDownload } from "~/lib/recon/downloadStore";
import { isReconId, outputFilename } from "~/lib/recon/reconId";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { id } = req.query;
  if (typeof id !== "string" || !isReconId(id)) {
    return res.status(400).json({ error: "Invalid recon id" });
  }

  const workbook = getDownload(id);
  if (!workbook) {
    return res
      .status(404)
      .json({ error: "Download not found or expired. Please reconcile again." });
  }

  const filename = outputFilename(id);
  res.setHeader("Content-Type", XLSX_MIME);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", workbook.length.toString());
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).send(workbook);
}
