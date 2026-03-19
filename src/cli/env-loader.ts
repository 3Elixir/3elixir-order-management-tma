// Must be imported before any module that references ~/env
process.env.SKIP_ENV_VALIDATION = "true";

import { config } from "dotenv";
import { z } from "zod";

config();

const cliEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  STRAPI_API_URL: z.string().url(),
  STRAPI_API_TOKEN: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHANNEL_ID: z.string().min(1),
});

const result = cliEnvSchema.safeParse(process.env);
if (!result.success) {
  process.stdout.write(
    JSON.stringify({
      ok: false,
      error: {
        code: "ENV_ERROR",
        message: "Missing or invalid environment variables",
        details: result.error.flatten(),
      },
    }) + "\n",
  );
  process.exit(1);
}
