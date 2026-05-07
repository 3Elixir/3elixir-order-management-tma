import type { NextApiRequest, NextApiResponse } from "next";
import { Telegram, TelegramError } from "telegraf";
import { z } from "zod";
import { env } from "~/env";
import { get as getDownload, type ReconEntry } from "~/lib/recon/downloadStore";
import { isReconId, outputFilename } from "~/lib/recon/reconId";

const bodySchema = z.object({
  id: z.string().refine(isReconId, "Invalid recon id"),
  chatId: z.number(),
});

function fmtSGD(n: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2,
  }).format(n);
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildSummaryHtml(reconId: string, entry: ReconEntry): string {
  const { summary, breakdown, compiled } = entry.previews;
  const uniqueOrderIds = new Set(compiled.map((r) => r.orderId).filter(Boolean))
    .size;
  const lines = [
    `📊 <b>ShopeeRecon summary</b>`,
    `<code>${htmlEscape(reconId)}</code>`,
    ``,
    `<b>Totals</b>`,
    `• Total released: <b>${htmlEscape(fmtSGD(summary.totalReleased))}</b>`,
    `• Commission fee: ${htmlEscape(fmtSGD(summary.commissionFee))}`,
    `• Transaction fee: ${htmlEscape(fmtSGD(summary.transactionFee))}`,
    `• Shipping fee: ${htmlEscape(fmtSGD(summary.totalShippingFee))}`,
    ``,
    `<b>Scope</b>`,
    `• Orders: ${uniqueOrderIds}`,
    `• SKUs: ${breakdown.length}`,
    `• Compiled rows: ${compiled.length}`,
    `• Unmatched income rows: ${entry.unmatched.count}`,
  ];
  return lines.join("\n");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid body", issues: parsed.error.issues });
  }
  const { id, chatId } = parsed.data;

  const entry = getDownload(id);
  if (!entry) {
    return res
      .status(404)
      .json({ error: "Download not found or expired. Please reconcile again." });
  }

  const filename = outputFilename(id);
  const telegram = new Telegram(env.TELEGRAM_BOT_TOKEN);

  try {
    await telegram.sendDocument(
      chatId,
      { source: entry.workbook, filename },
      { caption: buildSummaryHtml(id, entry), parse_mode: "HTML" },
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    if (err instanceof TelegramError) {
      return res.status(502).json({ error: err.description });
    }
    return res
      .status(500)
      .json({ error: (err as Error).message ?? "Failed to send document" });
  }
}
