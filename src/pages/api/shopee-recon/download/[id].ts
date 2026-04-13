import type { NextApiRequest, NextApiResponse } from "next";
import { get as getDownload } from "~/lib/recon/downloadStore";

const FILENAME = "Output_Updated.xlsx";
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { id } = req.query;
  if (typeof id !== "string" || !id) {
    return res.status(400).json({ error: "Missing download id" });
  }

  const workbook = getDownload(id);
  if (!workbook) {
    return res
      .status(404)
      .json({ error: "Download not found or expired. Please reconcile again." });
  }

  res.setHeader("Content-Type", XLSX_MIME);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${FILENAME}"`,
  );
  res.setHeader("Content-Length", workbook.length.toString());
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).send(workbook);
}
