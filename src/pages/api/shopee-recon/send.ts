import type { NextApiRequest, NextApiResponse } from "next";
import { Telegram, TelegramError } from "telegraf";
import { z } from "zod";
import { env } from "~/env";
import { get as getDownload } from "~/lib/recon/downloadStore";

const FILENAME = "Output_Updated.xlsx";

const bodySchema = z.object({
  id: z.string().uuid(),
  chatId: z.number(),
});

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
    return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
  }
  const { id, chatId } = parsed.data;

  const workbook = getDownload(id);
  if (!workbook) {
    return res
      .status(404)
      .json({ error: "Download not found or expired. Please reconcile again." });
  }

  try {
    const telegram = new Telegram(env.TELEGRAM_BOT_TOKEN);
    await telegram.sendDocument(
      chatId,
      { source: workbook, filename: FILENAME },
      { caption: "ShopeeRecon result" },
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
