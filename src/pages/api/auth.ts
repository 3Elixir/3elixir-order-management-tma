import { NextApiRequest, NextApiResponse } from "next";
import { validate } from "@tma.js/init-data-node";
import { env } from "~/env";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // Validate the initData by using the secret key
    const { initDataRaw } = req.body;
    validate(initDataRaw, env.TELEGRAM_BOT_TOKEN, { expiresIn: 604800 });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(400).json({ success: false, error: "Unknown error" });
  }

  res.status(200).json({ success: true, message: "Validated" });
}
