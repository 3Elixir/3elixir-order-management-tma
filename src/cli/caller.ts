import { createCaller as createActualCaller } from "~/server/api/root";
import { db } from "~/server/db";
import { sign } from "@tma.js/init-data-node";

// STRAPI_API_TOKEN is not mapped in src/env.js for some reason! We have to read it directly from process.env
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export function getCaller() {
  const initData = sign(
    {
      queryId: "cli_query",
      user: {
        id: 999999999,
        isBot: false,
        firstName: "CLI",
        lastName: "User",
        username: "cli_runner",
        languageCode: "en",
        isPremium: false,
        addedToAttachmentMenu: false,
        allowsWriteToPm: true
      },
    },
    TELEGRAM_BOT_TOKEN,
    new Date() // properly injects authDate behind the scenes
  );

  return createActualCaller({
    db,
    req: {
      headers: {
        "x-telegram-init-data": initData,
        authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
    } as any,
    res: {} as any,
  });
}
