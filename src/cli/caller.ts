import { createCaller as createActualCaller } from "~/server/api/root";
import { db } from "~/server/db";
import { sign } from "@tma.js/init-data-node";
import { env } from "~/env";

export function getCaller() {
  const initData = sign(
    {
      auth_date: new Date(),
      query_id: "cli_query",
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
    env.TELEGRAM_BOT_TOKEN,
    new Date() // properly injects auth_date 
  );

  const fakeJwt = "fake_jwt_token_for_cli";

  return createActualCaller({
    db,
    req: {
      headers: {
        "x-telegram-init-data": initData,
        authorization: `Bearer ${fakeJwt}`,
      },
    } as any,
    res: {} as any,
  });
}
