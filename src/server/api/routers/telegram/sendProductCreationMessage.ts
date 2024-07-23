import { Telegram, TelegramError } from "telegraf";
import { z } from "zod";
import { env } from "~/env";
import { escapeSpecialChars } from "~/lib/utils";
import { publicProcedure } from "~/server/api/trpc";

const inputSchema = z.object({
  chatId: z.number(),
  sku: z.string(),
});

export const sendProductCreationMessage = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const { chatId, sku } = input;

    try {
      const telegram = new Telegram(env.TELEGRAM_BOT_TOKEN);
      const message = await telegram.sendMessage(
        chatId,
        `*🎉Product \\#${escapeSpecialChars(sku)} created successfully\\!*`,
        {
          parse_mode: "MarkdownV2",
        },
      );
      return {
        success: true,
        message: "Confirmation message sent",
        message_id: message.message_id,
      };
    } catch (error) {
      console.error("Error sending confirmation message", error);
      if (error instanceof TelegramError) {
        return {
          success: false,
          message: error.description,
        };
      }
      return {
        success: false,
        message: "Error sending confirmation message",
      };
    }
  });
