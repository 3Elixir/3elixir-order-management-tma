# AGENTS.md — 3Elixir Order Management TMA

## Project Overview

A **Next.js 14** Telegram Mini App (TMA) for order, product, and customer management. The backend is a **tRPC** API layer that proxies a **Strapi CMS** instance — all business data (orders, products, customers) lives in Strapi, not in the local database.

**Stack**: Next.js 14 · tRPC v11 · Prisma (SQLite, minimal) · Strapi CMS (external) · Telegram Bot API · Tailwind CSS · Zustand · Vitest

---

## Quick Start

### Prerequisites

- **Node.js** >= 20
- **pnpm** 8.x (`corepack enable && corepack prepare pnpm@8.15.4 --activate`)
- A running **Strapi** instance with the 3Elixir content types
- A **Telegram Bot** token (from [@BotFather](https://t.me/BotFather))

### 1. Clone and install

```bash
git clone <repo-url>
cd 3elixir-order-management-tma
pnpm install          # runs `prisma generate` via postinstall
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
# Database (SQLite — used minimally, Strapi holds business data)
DATABASE_URL="file:./prisma/db.sqlite"
DIRECT_URL="file:./prisma/db.sqlite"

# Strapi CMS — the primary data backend
STRAPI_API_URL="https://your-strapi-instance.example.com"
STRAPI_API_TOKEN="your-strapi-api-token"

# Telegram Bot
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
TELEGRAM_CHANNEL_ID="your-telegram-channel-id"

# Client-side (exposed to browser)
NEXT_PUBLIC_STRAPI_API_URL="https://your-strapi-instance.example.com"
NEXT_PUBLIC_TELEGRAM_MINI_APP_URL="https://your-app-url.example.com"
```

All server-side variables are validated at startup by `src/env.js` (via `@t3-oss/env-nextjs`). The CLI has its own validator in `src/cli/env-loader.ts`.

### 3. Initialize the database

```bash
pnpm db:push          # sync Prisma schema → SQLite
```

### 4. Run the dev server

```bash
pnpm dev              # starts Next.js on http://localhost:3000
```

---

## CLI Tool

A tRPC CLI wrapper that exposes all 39 backend procedures as JSON commands. Designed for AI agents and scripting.

### Development mode (no build needed)

```bash
pnpm cli list
pnpm cli schema order.getFilteredOrders
pnpm cli call order.getPaymentMethods
pnpm cli call order.getOrderDetails '{"orderId":"42"}'
echo '{"orderId":"42"}' | pnpm cli call order.getOrderDetails --stdin
```

### Build and install globally

```bash
pnpm build:cli        # bundles to dist/cli/index.js (~1.2MB)
npm link              # creates global `3elixir-cli` symlink
```

Then from any terminal (env vars must be available):

```bash
3elixir-cli list
3elixir-cli call order.getPaymentMethods
```

**Important**: The CLI needs `@prisma/client` from this project's `node_modules` (resolved via the symlink) and the 6 environment variables above. It cannot run as a fully standalone binary.

### CLI output format

All output is JSON on stdout. Stderr is used for logs.

```jsonc
// Success
{ "ok": true, "procedure": "order.getPaymentMethods", "type": "query", "data": [...] }

// Error
{ "ok": false, "procedure": "...", "error": { "code": "NOT_FOUND", "message": "...", "zodErrors": null } }
```

---

## Project Structure

```
src/
├── cli/                    # tRPC CLI wrapper
│   ├── index.ts            # Entry point — arg parsing, command routing
│   ├── env-loader.ts       # Loads .env, validates required vars
│   ├── caller.ts           # Creates tRPC server-side caller
│   ├── registry.ts         # Introspects appRouter for procedure metadata
│   ├── executor.ts         # Dispatches procedure calls, date coercion
│   ├── output.ts           # JSON envelope formatting (success/error)
│   └── __tests__/          # Vitest tests (96 tests)
├── server/
│   ├── api/
│   │   ├── root.ts         # appRouter — merges all sub-routers
│   │   ├── trpc.ts         # tRPC context and middleware
│   │   └── routers/        # 8 domain routers, ~47 files
│   │       ├── order/      # CRUD + status + payment/fulfilment methods
│   │       ├── product/    # CRUD + filters + brands/categories
│   │       ├── customer/   # CRUD + filtering
│   │       ├── customer-product/  # Custom pricing per customer
│   │       ├── salesAgent/
│   │       ├── salesChannel/
│   │       ├── orderStatus/
│   │       └── telegram/   # Bot notification messages
│   └── db.ts               # Prisma client singleton
├── pages/                  # Next.js pages (customers, orders, products)
├── components/             # UI components (Radix UI based)
├── stores/                 # Zustand state management
├── types/                  # Shared TypeScript types / Zod schemas
└── env.js                  # Environment validation (T3 env)
```

---

## Available tRPC Routers

| Router            | Procedures | Type     | Description                          |
|-------------------|-----------|----------|--------------------------------------|
| `order`           | 10        | mix      | Orders CRUD, payment/fulfilment methods, GST |
| `product`         | 9         | mix      | Products CRUD, filters, brands, categories |
| `customer`        | 5         | mix      | Customers CRUD                       |
| `customerProduct` | 3         | mix      | Custom pricing per customer-product pair |
| `telegram`        | 8         | mutation | Bot notification messages             |
| `orderStatus`     | 2         | query    | Order status lookups                 |
| `salesAgent`      | 1         | query    | Sales agent list                     |
| `salesChannel`    | 1         | query    | Sales channel list                   |

All data flows through Strapi — the tRPC procedures are thin wrappers that call the Strapi REST API using `qs` for query building.

---

## Testing

```bash
pnpm test             # run once
pnpm test:watch       # watch mode
```

**Test suites** (96 tests total):
- `registry.test.ts` — procedure discovery, types, input schemas
- `executor.test.ts` — procedure dispatch, date coercion, input parsing
- `output.test.ts` — success/error envelope formatting
- `integration.test.ts` — full CLI subprocess tests (help, list, schema, errors)

Tests mock the database caller and use env stubs — no real DB or Strapi connection needed.

---

## Key Scripts

| Script          | Command                | Description                     |
|-----------------|------------------------|---------------------------------|
| `pnpm dev`      | `next dev`             | Start dev server                |
| `pnpm build`    | `next build`           | Production build                |
| `pnpm start`    | `next start`           | Start production server         |
| `pnpm cli`      | `tsx src/cli/index.ts`  | Run CLI in dev mode            |
| `pnpm build:cli`| `tsup --config tsup.cli.ts` | Bundle CLI for global install |
| `pnpm test`     | `vitest run`           | Run tests                       |
| `pnpm db:push`  | `prisma db push`       | Sync schema to database         |
| `pnpm db:studio`| `prisma studio`        | Open Prisma Studio GUI          |
| `pnpm lint`     | `next lint`            | Run ESLint                      |

---

## Path Aliases

Configured in `tsconfig.json` and mirrored in `vitest.config.ts`:

| Alias            | Path               |
|------------------|--------------------|
| `~/`             | `src/`             |
| `@components/`   | `src/components/`  |
| `@server/`       | `src/server/`      |
| `@stores/`       | `src/stores/`      |
| `@utils/`        | `src/utils/`       |
| `@schema/`       | `src/types/`       |
| `@lib/`          | `src/lib/`         |

---

## Architecture Notes

- **Strapi is the source of truth** — the local SQLite database is a T3 scaffold artifact. All business entities (orders, products, customers, etc.) are stored in and fetched from Strapi via its REST API.
- **tRPC procedures are Strapi wrappers** — each procedure builds a Strapi query using `qs`, calls the Strapi API with the configured token, and returns typed responses.
- **The CLI reuses the server-side tRPC caller** — it creates a `createCaller()` context identical to what the Next.js API routes use, so CLI calls go through the exact same validation and logic as web requests.
- **Telegram integration** — mutation procedures in the `telegram` router send formatted messages to a Telegram channel via the Bot API (using `telegraf`).

---

## Development Workflow

Our development flow strictly follows this environment progression:
1. **feature branch**: All new features and bug fixes must be developed on a dedicated feature branch.
2. **staging**: Merge feature branches into the `staging` branch. Pushing to `staging` automatically triggers a deployment to the Vercel staging environment. This is where features are tested and validated.
3. **main**: Once verified in staging, merge the changes into `main` for production deployment.
