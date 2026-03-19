// Must run before any module that imports ~/env
process.env.SKIP_ENV_VALIDATION = "true";
process.env.DATABASE_URL = "postgresql://localhost:5432/test";
process.env.DIRECT_URL = "postgresql://localhost:5432/test";
process.env.STRAPI_API_URL = "https://strapi.example.com";
process.env.STRAPI_API_TOKEN = "test-token";
process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
process.env.TELEGRAM_CHANNEL_ID = "test-channel-id";
