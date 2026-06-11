# Cursor Scaffold Prompt — Restaurant Order & Payment System

## What to build

A full-stack multi-tenant restaurant order and payment SaaS for Ethiopian restaurants.
Single Next.js App Router project that owns all frontend screens, all API routes,
and a standalone Node WebSocket hub process.

First demo tenant: **Bole Cafe** (`bole-cafe`).

Do not build placeholder UI. Build real, working screens with the Lovable warm
cream / orange / navy theme from the design system doc.

---

## Source documents (read all before writing any code)

| Doc | Purpose |
|-----|---------|
| `docs/00-project-overview.md` | Product shape, actors, tech stack, MVP rules |
| `docs/01-foundation-data-auth.md` | Prisma schema, auth API, tenant model, seed data |
| `docs/02-customer-ordering-phase.md` | Customer flow |
| `docs/03-kitchen-kds-phase.md` | Kitchen KDS |
| `docs/04-waiter-phase.md` | Waiter dashboard |
| `docs/05-cashier-payment-phase.md` | Cashier billing |
| `docs/06-admin-restaurant-ops-phase.md` | Admin panel |
| `docs/07-realtime-communication-contracts.md` | WebSocket events, payloads, reconnect |
| `docs/08-ui-design-system-pixel-guide.md` | Design tokens, component specs, pixel rules |
| `docs/09-build-order-and-checklists.md` | Phase order and acceptance checklists |

---

## Tech stack (non-negotiable for Phase 1)

- Next.js App Router, TypeScript strict mode
- React Server Components for read-heavy pages; `"use client"` only for
  interactive dashboards, drawers, cart, KDS, realtime subscriptions
- Prisma ORM + PostgreSQL
- Route Handlers as the primary API contract; Server Actions only for
  simple form mutations where they reduce boilerplate
- `bcrypt` or `argon2` for password hashing
- HTTP-only cookies for staff sessions
- Standalone Node WebSocket hub process (`ws` npm package, no Socket.IO)
- Zod for all request validation and environment variable validation
- No Redis. Single-instance in-memory WebSocket hub for MVP.
- Mock Telebirr only — no real payment integration in Phase 1

---

## Canonical folder structure

Create **exactly** this structure. Do not deviate.

```
src/
  middleware.ts                    # Role + tenant guards — see §Role guards below

  app/
    page.tsx                       # Landing / demo hub
    layout.tsx
    globals.css                    # Design tokens as CSS variables

    r/
      [slug]/
        layout.tsx                 # Load restaurant by slug once; provide tenant
                                   # context, CSS variable overrides, language
        not-found.tsx              # "Restaurant not found" screen

        staff/
          page.tsx                 # Staff login + role picker

        t/
          [table]/
            page.tsx               # Customer QR entry point
            loading.tsx            # Menu skeleton
            error.tsx              # Bootstrap failure

        waiter/
          page.tsx
          loading.tsx

        kitchen/
          page.tsx
          loading.tsx

        cashier/
          page.tsx
          loading.tsx

        admin/
          page.tsx                 # Admin dashboard
          loading.tsx
          menu/page.tsx
          inventory/page.tsx
          tables/page.tsx
          staff/page.tsx
          settings/page.tsx
          audit-log/page.tsx

    api/
      auth/
        staff/
          login/route.ts           # POST
          logout/route.ts          # POST
          me/route.ts              # GET

      restaurants/
        [slug]/
          tables/
            [tableNumber]/
              bootstrap/route.ts   # GET — public, no auth required

      sessions/
        route.ts                   # POST — create session
        [sessionId]/
          route.ts                 # GET
          close/route.ts           # POST
          orders/route.ts          # POST — create order under session
          assistance/route.ts      # POST — create assistance request

      order-items/
        [itemId]/
          status/route.ts          # PATCH — kitchen advances status
          cancel/route.ts          # PATCH — waiter cancels with reason

      assistance/
        [requestId]/route.ts       # PATCH — acknowledge / resolve

      payments/
        route.ts                   # GET session payment
        transactions/route.ts      # POST — record cash transaction
        finalize/route.ts          # POST — cashier closes session
        telebirr/
          mock/route.ts            # POST — mock Telebirr initiation
          verify/route.ts          # POST — cashier manual verification

      staff/
        route.ts                   # GET list, POST create (owner only)
        [staffId]/route.ts         # PATCH, DELETE
        assignments/route.ts       # POST assign table

      menu/
        route.ts                   # GET categories+items, POST category
        items/route.ts             # POST
        items/[itemId]/route.ts    # PATCH, DELETE

      tables/
        route.ts                   # GET list, POST create
        [tableId]/route.ts         # PATCH

      inventory/
        route.ts                   # GET, POST ingredient
        [ingredientId]/route.ts    # PATCH

  components/
    ui/                            # Headless primitives: Button, Input, Badge,
                                   # Sheet, Dialog, Tabs, Select, Checkbox
    shared/
      RestaurantHeader.tsx
      LanguageToggle.tsx
      StatusChip.tsx               # pending / being_prepared / served / cancelled
      Money.tsx                    # Always ETB, uses lib/money
      EmptyState.tsx
      AppCard.tsx
      SyncIndicator.tsx            # WebSocket reconnect banner
      RoleBadge.tsx
      TableStatusCard.tsx

  features/
    customer/
      components/                  # MenuPage, CategoryTabs, MenuItemCard,
                                   # ItemDrawer, CartView, OrderStatusList,
                                   # PayScreen, BlockedDeviceScreen,
                                   # WaiterSessionMessage, ReceiptView
      hooks/
        use-cart.ts
        use-session-status.ts
        use-orders.ts
      utils/
        cart-total.ts
        order-grouping.ts

    waiter/
      components/                  # TableGrid, TableDetailPanel,
                                   # AssistanceInbox, SelfAssignButton,
                                   # WaiterOrderForm, TelebirrAssistFlow
      hooks/
        use-table-assignments.ts
        use-assistance-requests.ts

    kitchen/
      components/                  # KdsBoard, TableColumn, OrderCard,
                                   # OrderItemRow, StatusActionButton,
                                   # TimeFilter, ActivityLogSidebar
      hooks/
        use-kds-orders.ts

    cashier/
      components/                  # SessionList, BillDetail, CashPaymentForm,
                                   # VerificationQueue, ReceiptView
      hooks/
        use-session-bill.ts

    admin/
      components/                  # AdminSidebar, DashboardSummary,
                                   # MenuManager, InventoryManager,
                                   # TableManager, QrGenerator,
                                   # StaffManager, SettingsForm, AuditLogTable
      hooks/
        use-admin-data.ts

  lib/
    env.ts                         # Zod-validated environment variables —
                                   # throws at startup if required vars missing

    db/
      prisma.ts                    # Singleton Prisma client

    auth/
      password.ts                  # hash + verify with bcrypt/argon2
      session.ts                   # read/write HTTP-only staff session cookie
      permissions.ts               # canActor(role, action) helper
      use-device-token.ts          # client hook: localStorage device token

    restaurants/
      queries.ts
      service.ts

    sessions/
      queries.ts
      service.ts

    orders/
      queries.ts
      service.ts

    payments/
      service.ts
      telebirr-mock.ts

    inventory/
      queries.ts
      service.ts

    realtime/
      events.ts                    # Shared event names + TypeScript types for
                                   # every WS event. Imported by hub, publisher,
                                   # and client hooks. Must be framework-free.
      publisher.ts                 # Server-only: called by route handlers after
                                   # DB mutations to push events to WS hub
      use-realtime.ts              # Client hook: connect, subscribe, reconnect
                                   # with exponential backoff

    i18n/
      index.ts                     # t(key, lang) lookup function
      types.ts                     # SupportedLocale = 'en' | 'am'

    money/
      index.ts                     # formatETB, parseETB, computeTotals

    validation/
      session.ts                   # Zod schemas for session endpoints
      order.ts
      payment.ts
      staff.ts
      menu.ts

    utils.ts
    constants.ts

messages/
  en.json                          # All UI string keys in English
  am.json                          # All UI string keys in Amharic

ws/                                # Standalone WebSocket hub process
  hub.ts                           # In-memory client registry, subscribe/publish
  index.ts                         # Entry point — npm run dev:ws

prisma/
  schema.prisma                    # Exact schema from docs/01-foundation-data-auth.md
  seed.ts                          # Bole Cafe + 12 tables + demo staff + menu
  migrations/

public/
  images/
```

---

## Non-negotiable architectural rules

### Tenant isolation

Every DB query that touches restaurant-owned data must include `restaurantId`
in the WHERE clause. The slug from the URL is resolved to a `restaurantId` in
`r/[slug]/layout.tsx` once and passed via React context. Never trust the client
to provide `restaurantId` directly.

### Middleware role guards

`src/middleware.ts` must enforce this matrix on every request:

| Route prefix | Allowed staff roles | Public? |
|---|---|---|
| `/r/[slug]/t/[table]` | — | Yes (customer) |
| `/r/[slug]/staff` | — | Yes (login page) |
| `/r/[slug]/waiter` | WAITER, OWNER | No |
| `/r/[slug]/kitchen` | KITCHEN, OWNER | No |
| `/r/[slug]/cashier` | CASHIER, OWNER | No |
| `/r/[slug]/admin` | OWNER | No |
| `/api/auth/staff/*` | — | Yes |
| `/api/restaurants/*/bootstrap` | — | Yes |

Redirect unauthorized staff to `/r/[slug]/staff`.

### Route handlers stay thin

Every route handler must:
1. Validate input with a Zod schema from `lib/validation/`
2. Call a `lib/<domain>/service.ts` function
3. After a mutation, call `lib/realtime/publisher.ts` to push the WS event
4. Return the response

No business logic inside route handlers.

### WebSocket event flow

```
Route Handler
  → lib/<domain>/service.ts   (DB mutation)
  → lib/realtime/publisher.ts (send event to WS hub)
  → ws/hub.ts                 (broadcast to subscribed clients)
  → lib/realtime/use-realtime.ts  (client refetches from API)
```

Clients refetch from the API after receiving an event.
They do not trust the event payload as the source of truth.

### QR code generation

QR codes are generated entirely client-side on demand in
`features/admin/components/QrGenerator.tsx`.

Steps:
1. Construct the URL: `` `https://order.app.com/r/${slug}/t/${tableNumber}` ``
2. Pass to the `qrcode` npm package to render into a `<canvas>`
3. Offer a **Download** button (`canvas.toDataURL()` → anchor with `download` attr)
   and a **Copy URL** button

No QR files are stored. No server endpoint is needed. The URL is fully
deterministic from data already in the database.

### Types: derive, don't duplicate

- Entity types come from Prisma generated types (`@prisma/client`)
- Request/response DTO types come from `z.infer<typeof schema>` in `lib/validation/`
- WebSocket event types live in `lib/realtime/events.ts` only
- Do NOT create a parallel `types/` folder mirroring entity shapes

### i18n

- All UI strings use `t(key, locale)` from `lib/i18n/`
- Locale files live in `messages/en.json` and `messages/am.json`
- Language selection is persisted in `localStorage`
- Menu item names, category names, and modifier names use `i18nKey` fields —
  look up in the same locale files
- Never hardcode display strings in components

### Design tokens

Apply all design tokens from `docs/08-ui-design-system-pixel-guide.md` as CSS
variables in `globals.css`. Restaurant bootstrap colors override `--primary` and
`--secondary` via inline style on the `r/[slug]/layout.tsx` wrapper element.
Never hardcode color hex values inside component files.

---

## Environment variables

Define and validate all of these in `lib/env.ts` using Zod. The app must throw
a clear error at startup if any required variable is missing.

```
DATABASE_URL          # PostgreSQL connection string
SESSION_SECRET        # Min 32 chars — signs HTTP-only staff session cookie
WS_HUB_URL           # e.g. ws://localhost:3001/realtime
NEXT_PUBLIC_APP_URL  # e.g. https://order.app.com (used in QR URL construction)
NODE_ENV             # development | production | test
```

---

## Phase 0 tasks (do these first, in order)

1. Scaffold Next.js App Router project with TypeScript strict mode
2. Install dependencies:
   ```
   prisma @prisma/client
   zod
   bcryptjs @types/bcryptjs
   ws @types/ws
   qrcode @types/qrcode
   iron-session
   clsx tailwind-merge
   concurrently tsx
   tailwindcss postcss autoprefixer
   ```
3. Create `lib/env.ts` with Zod validation for all required env vars
4. Create `prisma/schema.prisma` — exact schema from `docs/01-foundation-data-auth.md`
5. Run `prisma migrate dev --name init`
6. Write `prisma/seed.ts` — Bole Cafe, 12 tables, 4 demo staff, full menu
   (see seed spec in `docs/01-foundation-data-auth.md §Seed Data`)
7. Create `src/app/globals.css` with all CSS variables from
   `docs/08-ui-design-system-pixel-guide.md §Design Tokens`
8. Create placeholder `page.tsx` shells for every actor route so the app
   compiles with all routes present
9. Create `ws/hub.ts` and `ws/index.ts` — basic in-memory subscribe/broadcast
10. Add npm scripts to `package.json`:
    ```json
    "dev":     "next dev",
    "dev:ws":  "tsx watch ws/index.ts",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:ws\"",
    "db:seed": "prisma db seed"
    ```

### Phase 0 is done when:

- `npm run dev:all` starts without errors
- `/r/bole-cafe/t/1` returns a page (even a skeleton)
- `prisma studio` shows seeded Bole Cafe data with 12 tables and demo staff
- Wrong-role access to `/r/bole-cafe/admin` redirects to `/r/bole-cafe/staff`
- `ws/index.ts` starts on port 3001 without errors

---

## Build order after Phase 0

Follow `docs/09-build-order-and-checklists.md` exactly. Complete each phase's
acceptance checklist before starting the next.

| Phase | Reference doc |
|-------|--------------|
| 1 — Foundation auth | `docs/01-foundation-data-auth.md` |
| 2 — Customer ordering | `docs/02-customer-ordering-phase.md` |
| 3 — Realtime base (WS + order.placed) | `docs/07-realtime-communication-contracts.md` |
| 4 — Kitchen KDS | `docs/03-kitchen-kds-phase.md` |
| 5 — Waiter | `docs/04-waiter-phase.md` |
| 6 — Cashier | `docs/05-cashier-payment-phase.md` |
| 7 — Admin | `docs/06-admin-restaurant-ops-phase.md` |
| 8 — i18n + Polish | `docs/09-build-order-and-checklists.md §Phase 8` |

### First end-to-end milestone

> Customer adds Doro Wat → places order → Kitchen sees pending item →
> Kitchen marks served → Customer sees served → Cashier can finalize bill.

The MVP is not shippable until this full flow works without a browser refresh
at any step.
