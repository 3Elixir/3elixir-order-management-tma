# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Telegram Mini App (TMA) for order management built with the T3 Stack (Next.js, tRPC, Prisma, Tailwind CSS). The app runs inside Telegram and integrates with a Strapi CMS backend for data persistence and Telegram Bot API for notifications.

## Tech Stack

- **Frontend**: Next.js 14 (Pages Router), React 18, TypeScript
- **Backend**: tRPC, Strapi CMS (external)
- **Database**: Prisma (SQLite for dev, configured via Strapi)
- **State Management**: Zustand (form stores), React Query (server state)
- **UI**: Tailwind CSS, Radix UI, shadcn/ui components
- **Telegram**: @tma.js/sdk for Mini App features
- **Package Manager**: pnpm 8.15.4

## Essential Commands

```bash
# Development
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Database
pnpm db:push          # Push Prisma schema changes
pnpm db:studio        # Open Prisma Studio
pnpm postinstall      # Generate Prisma client (runs automatically)
```

## Architecture

### Pages Structure (Next.js Pages Router)

- `src/pages/_app.tsx` - Root app component with providers (Auth, TMA SDK, Stores)
- `src/pages/index.tsx` - Home/landing page
- `src/pages/orders/` - Order management pages (list, create multi-step, detail)
- `src/pages/products/` - Product management pages
- `src/pages/customers/` - Customer management pages
- `src/pages/api/trpc/[trpc].ts` - tRPC API endpoint

### tRPC API Architecture

All API routes are defined in `src/server/api/routers/` and organized by domain:

- **Routers**: `order`, `product`, `customer`, `customerProduct`, `salesAgent`, `salesChannel`, `orderStatus`, `telegram`
- **Root**: `src/server/api/root.ts` combines all routers into `appRouter`
- **Procedures**: Each router exports specific procedures (e.g., `createOrder`, `getFilteredOrders`)
- **Pattern**: Each procedure file in `routers/{domain}/` exports a single tRPC procedure

Example router structure:

```
src/server/api/routers/order/
├── index.ts                    # Exports orderRouter with all procedures
├── createOrder.ts              # Single procedure: createOrder
├── getFilteredOrders.ts        # Single procedure: getFilteredOrders
└── ...
```

### Data Flow

1. **Client → Server**: React components use `api.{router}.{procedure}.useQuery/useMutation` hooks
2. **Server → Strapi**: tRPC procedures make HTTP requests to Strapi CMS API (`env.STRAPI_API_URL`)
3. **Server → Telegram**: Some mutations trigger Telegram notifications via Bot API
4. **Strapi Response**: All responses are validated with Zod schemas before returning to client

### State Management

- **Zustand Stores** (`src/stores/`): Form state for multi-step forms
  - `order-form-store.ts` - Order creation/editing state
  - `product-form-store.ts` - Product creation/editing state
  - `customer-form-store.ts` - Customer creation/editing state
  - Pattern: Store + custom hook (`useOrderForm`, `useProductForm`, etc.)
- **React Query**: Server state managed by tRPC (automatic caching, refetching)

### Authentication

- `src/lib/contexts/AuthProvider.tsx` handles Telegram user authentication via Strapi
- Uses Telegram user ID as both identifier and password
- JWT stored in localStorage
- `AuthGuard` component protects routes requiring authentication

### Form Schemas

All form validation schemas are in `src/types/`:

- `order-schema.ts` - Multi-step order form (step1-4 + combined schema)
- `product-schema.ts` - Product form validation
- `customer-schema.ts` - Customer form validation

### Path Aliases

Configured in `tsconfig.json`:

```
~/*           → src/*
@components/* → src/components/*
@lib/*        → src/lib/*
@pages/*      → src/pages/*
@stores/*     → src/stores/*
@server/*     → src/server/*
@utils/*      → src/utils/*
@schema/*     → src/types/*
```

## Environment Variables

Required environment variables (see `src/env.js` for schema):

**Server-side:**

- `DATABASE_URL` - Prisma database connection
- `DIRECT_URL` - Direct database connection
- `STRAPI_API_URL` - Strapi CMS backend URL
- `STRAPI_API_TOKEN` - Strapi API authentication token
- `TELEGRAM_BOT_TOKEN` - Telegram bot token for notifications
- `TELEGRAM_CHANNEL_ID` - Telegram channel for order notifications
- `NODE_ENV` - development | test | production

**Client-side:**

- `NEXT_PUBLIC_STRAPI_API_URL` - Strapi URL for client-side requests
- `NEXT_PUBLIC_TELEGRAM_MINI_APP_URL` - Telegram Mini App URL

## Key Patterns

### Adding a New tRPC Procedure

1. Create procedure file in `src/server/api/routers/{domain}/{procedureName}.ts`
2. Export a single procedure using `publicProcedure`
3. Import and add to router in `src/server/api/routers/{domain}/index.ts`
4. Use on client: `api.{domain}.{procedureName}.useQuery()` or `.useMutation()`

### Creating Multi-Step Forms

Follow the order creation pattern:

1. Split schema into steps (`orderFormStep1Schema`, `orderFormStep2Schema`, etc.)
2. Create Zustand store with step state and actions
3. Create page for each step (`create-step1.tsx`, `create-step2.tsx`, etc.)
4. Merge schemas for final submission (`orderFormSchema`)

### Telegram Integration

- TMA SDK initialized in `src/components/layouts/TmaSdkLoader.tsx`
- Use `@tma.js/sdk-react` hooks: `useInitData()`, `useMainButton()`, etc.
- Eruda (mobile debugger) auto-loads in development mode for easier debugging

## Notes

- The Prisma schema in `prisma/schema.prisma` is minimal (Post model only) - actual data models are in Strapi
- Strapi CMS is the source of truth for data persistence (orders, products, customers, etc.)
- Timezone conversions use `date-fns` and `date-fns-tz` (see recent commits)
- Sales agents are only required for specific sales channels (defined in `SALES_CHANNELS_WITH_SALES_AGENTS`)
