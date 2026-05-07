import type { NextApiRequest, NextApiResponse } from "next";
import { Telegram, TelegramError } from "telegraf";
import { z } from "zod";
import { env } from "~/env";
import { isReconId, outputFilename } from "~/lib/recon/reconId";

const summaryStatsSchema = z.object({
  totalReleased: z.number(),
  commissionFee: z.number(),
  transactionFee: z.number(),
  totalShippingFee: z.number(),
  uniqueOrders: z.number(),
  skuCount: z.number(),
  compiledRows: z.number(),
  unmatchedCount: z.number(),
});

const bodySchema = z.object({
  id: z.string().refine(isReconId, "Invalid recon id"),
  chatId: z.number(),
  workbookB64: z.string().min(1),
  summaryStats: summaryStatsSchema,
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

function buildSummaryHtml(reconId: string, stats: z.infer<typeof summaryStatsSchema>): string {
  const lines = [
    `📊 <b>ShopeeRecon summary</b>`,
    `<code>${htmlEscape(reconId)}</code>`,
    ``,
    `<b>Totals</b>`,
    `• Total released: <b>${htmlEscape(fmtSGD(stats.totalReleased))}</b>`,
    `• Commission fee: ${htmlEscape(fmtSGD(stats.commissionFee))}`,
    `• Transaction fee: ${htmlEscape(fmtSGD(stats.transactionFee))}`,
    `• Shipping fee: ${htmlEscape(fmtSGD(stats.totalShippingFee))}`,
    ``,
    `<b>Scope</b>`,
    `• Orders: ${stats.uniqueOrders}`,
    `• SKUs: ${stats.skuCount}`,
    `• Compiled rows: ${stats.compiledRows}`,
    `• Unmatched income rows: ${stats.unmatchedCount}`,
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
  const { id, chatId, workbookB64, summaryStats } = parsed.data;

  const workbook = Buffer.from(workbookB64, 'base64');
  const filename = outputFilename(id);
  const telegram = new Telegram(env.TELEGRAM_BOT_TOKEN);

  try {
    await telegram.sendDocument(
      chatId,
      { source: workbook, filename },
      { caption: buildSummaryHtml(id, summaryStats), parse_mode: "HTML" },
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
