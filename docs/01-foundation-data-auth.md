# Phase 1 Foundation: Data, Auth, Tenant Scope

## Goal

Complete the shared foundation on top of the Phase 0 scaffold. Phase 0 delivered the project shell, database schema, seed data, route placeholders, middleware skeleton, and tenant layout. **Phase 1 implements the working auth flows, public bootstrap API, and customer device-token session model** so actor screens can be built in later phases.

## Prerequisites (Phase 0 — done)

These are already in the repo. Do not rebuild them unless fixing a bug.

| Item | Location | Status |
| --- | --- | --- |
| Next.js App Router + TypeScript strict | `src/app/` | Done |
| Zod env validation | `src/lib/env.ts` | Done |
| Prisma schema | `prisma/schema.prisma` | Done |
| Initial migration | `prisma/migrations/` | Done |
| Bole Cafe seed | `prisma/seed.ts` | Done |
| Design tokens | `src/app/globals.css` | Done |
| All actor route shells | `src/app/r/[slug]/…` | Done |
| Tenant layout + brand colors | `src/app/r/[slug]/layout.tsx` | Done |
| Restaurant client context | `src/lib/restaurants/context.tsx` | Done |
| Prisma → client serialization | `src/lib/restaurants/serialize.ts` | Done |
| Staff session cookie helpers | `src/lib/auth/session.ts` | Done (helpers only) |
| Password hash helpers | `src/lib/auth/password.ts` | Done |
| Role permission matrix | `src/lib/auth/permissions.ts` | Done |
| Middleware role guards | `src/middleware.ts` | Done (redirects only; no login yet) |
| i18n message files | `messages/en.json`, `messages/am.json` | Done |
| WebSocket hub shell | `ws/hub.ts`, `ws/index.ts` | Done |

### Local dev commands

```bash
npm run dev:all      # Next.js + WS hub
npm run db:seed      # Re-seed Bole Cafe
npx prisma studio    # Inspect data
```

### Demo credentials (seeded)

| Email | Role | Password |
| --- | --- | --- |
| `owner@bole.test` | OWNER | `password` |
| `waiter@bole.test` | WAITER | `password` |
| `kitchen@bole.test` | KITCHEN | `password` |
| `cashier@bole.test` | CASHIER | `password` |

---

## Required Stack

- Next.js App Router (already configured).
- PostgreSQL + Prisma (already configured).
- Route Handlers as the primary API contract.
- `bcryptjs` for password hashing (`src/lib/auth/password.ts`).
- `iron-session` HTTP-only cookies for staff sessions (`src/lib/auth/session.ts`).
- Zod validation in `src/lib/validation/`.
- No Redis.

---

## Database

The canonical schema lives in **`prisma/schema.prisma`**. Do not duplicate it in this doc.

Key conventions already enforced by the schema:

- Every restaurant-owned record includes `restaurantId` directly or through a parent relation.
- Staff emails are unique per restaurant (`@@unique([restaurantId, email])`).
- Table numbers are unique per restaurant (`@@unique([restaurantId, number])`).
- Customer sessions store `deviceTokenHash` only — never the raw token.

### Seed data (already applied)

- Restaurant: **Bole Cafe**, slug `bole-cafe`
- Tables: 1–12
- Staff: owner, waiter, kitchen, cashier (`*@bole.test`)
- Categories: Traditional, Grill and Tibs, Pizza, Drinks, Coffee
- Menu: Doro Wat (+ modifiers), Shiro, Kitfo, Margherita Pizza (+ size variants), Macchiato

Re-run with `npm run db:seed` after schema changes.

---

## Tenant Model

Every DB query that touches restaurant-owned data must include `restaurantId` in the WHERE clause. The slug from the URL is resolved to a `restaurantId` once in `src/app/r/[slug]/layout.tsx` and passed via `RestaurantProvider`. **Never trust the client to provide `restaurantId` directly.**

Public customer bootstrap is allowed without staff auth, but must only expose safe data:

- Restaurant name, slug, logo, brand colors, currency
- Table label and table number
- Open/closed status
- Menu categories/items/modifiers/variants that are available for customer display
- Session state (none / same device / blocked / waiter-started) — not the raw device token hash

### Prisma → Client Components

Prisma `Decimal` and `Date` fields cannot be passed to Client Components. Use `serializeRestaurant()` from `src/lib/restaurants/serialize.ts` (or equivalent serializers for other entities) before crossing the server/client boundary.

---

## Phase 1 Implementation Steps

Work through these in order. Each step should land as a small, testable slice.

### Step 1 — Validation schemas

Create Zod schemas in `src/lib/validation/`:

| File | Schemas |
| --- | --- |
| `staff.ts` | `staffLoginSchema` |
| `session.ts` | `createSessionSchema`, bootstrap query helpers |

Derive request/response types with `z.infer<typeof schema>`. Do not create a parallel `types/` folder.

### Step 2 — Restaurant + session services

| File | Responsibility |
| --- | --- |
| `src/lib/restaurants/service.ts` | Resolve slug → restaurant; compute `isOpen` from `openingHours`, `manualOpen`, timezone |
| `src/lib/restaurants/queries.ts` | Extend with menu query for bootstrap (categories + available items + variants + modifiers) |
| `src/lib/sessions/queries.ts` | Find active session by table; hash/compare device tokens |
| `src/lib/sessions/service.ts` | Create customer session; resolve `sessionState` for bootstrap |

Device token rules:

1. Generate a random token on the server when creating a customer-started session.
2. Store `bcrypt` hash in `Session.deviceTokenHash`.
3. Return the raw token once in the API response; client persists it in `localStorage`.
4. Key format: `restaurant:{slug}:table:{tableNumber}:deviceToken`
5. On session close, client clears the key.

Add `src/lib/auth/use-device-token.ts` — client hook to read/write/clear the localStorage key.

### Step 3 — Staff auth API routes

Thin route handlers only: validate → call service → return response.

| Route | Method | Notes |
| --- | --- | --- |
| `src/app/api/auth/staff/login/route.ts` | POST | Body: `{ restaurantSlug, email, password }` |
| `src/app/api/auth/staff/logout/route.ts` | POST | Destroy iron-session cookie |
| `src/app/api/auth/staff/me/route.ts` | GET | Return `{ staffId, restaurantId, restaurantSlug, role, name }` or 401 |

Login flow:

1. Resolve restaurant by `restaurantSlug`.
2. Find staff by `restaurantId` + `email`; verify `isActive`.
3. `verifyPassword()` against `passwordHash`.
4. Write session cookie via `getStaffSession()` with `{ staffId, restaurantId, restaurantSlug, role }`.
5. Never return `passwordHash`.

Add `src/lib/auth/service.ts` for the login/logout/me business logic if route files grow.

### Step 4 — Public bootstrap API

| Route | Method |
| --- | --- |
| `src/app/api/restaurants/[slug]/tables/[tableNumber]/bootstrap/route.ts` | GET |

Query params (optional): `deviceToken` — sent when re-visiting an active customer session.

Response shape:

```json
{
  "restaurant": {
    "id": "…",
    "slug": "bole-cafe",
    "name": "Bole Cafe",
    "logoUrl": null,
    "primaryColor": "#F97316",
    "secondaryColor": "#111827",
    "currency": "ETB"
  },
  "table": {
    "id": "…",
    "number": 1,
    "label": "Table 1"
  },
  "isOpen": true,
  "sessionState": "none",
  "sessionId": null,
  "deviceToken": null,
  "menu": []
}
```

`sessionState` values:

| Value | Meaning |
| --- | --- |
| `none` | No active session; bootstrap may create one on first order or via `POST /api/sessions` |
| `active_same_device` | Active customer session; token matches |
| `active_blocked_device` | Active customer session; token missing or wrong |
| `waiter_started` | Active session opened by waiter; no device binding |

Serialize all `Decimal` prices in menu payloads to numbers before returning JSON.

Menu item shape for bootstrap:

```json
{
  "id": "…",
  "nameI18nKey": "menu.doro_wat",
  "descriptionI18nKey": "menu.doro_wat_desc",
  "basePrice": 380,
  "imageUrl": null,
  "variants": [{ "id": "…", "nameI18nKey": "variant.small", "priceDelta": 0 }],
  "modifiers": [{ "id": "…", "nameI18nKey": "modifier.extra_injera", "priceDelta": 30, "isRequired": false }]
}
```

Filter: `manualAvailable === true && derivedAvailable === true`.

### Step 5 — Session creation API

| Route | Method |
| --- | --- |
| `src/app/api/sessions/route.ts` | POST |

Body: `{ restaurantSlug, tableNumber }` — used when bootstrap returns `sessionState: "none"` and the customer is ready to start ordering.

Response: `{ sessionId, deviceToken, sessionState: "active_same_device" }`.

Also scaffold (handlers can return 501 until Phase 2):

- `src/app/api/sessions/[sessionId]/route.ts` — GET
- `src/app/api/sessions/[sessionId]/close/route.ts` — POST

### Step 6 — Staff login UI

Replace the placeholder at `src/app/r/[slug]/staff/page.tsx` with a real login form:

- Email + password fields
- Submit to `POST /api/auth/staff/login` with `restaurantSlug` from the URL
- On success, redirect by role:
  - `OWNER` → `/r/[slug]/admin`
  - `WAITER` → `/r/[slug]/waiter`
  - `KITCHEN` → `/r/[slug]/kitchen`
  - `CASHIER` → `/r/[slug]/cashier`
- Show error state on 401
- Use `t(key, locale)` for all strings; add keys to `messages/en.json` and `messages/am.json`

### Step 7 — Wire customer page to bootstrap

Update `src/app/r/[slug]/t/[table]/page.tsx` (or a client child component) to:

1. Read device token from `useDeviceToken(slug, tableNumber)`.
2. Call bootstrap API on mount.
3. Render based on `sessionState`:
   - `none` → menu skeleton / start session CTA
   - `active_same_device` → proceed to menu (Phase 2 builds full UI)
   - `active_blocked_device` → blocked-device screen + assistance CTA
   - `waiter_started` → waiter-session message

### Step 8 — Tenant scoping helper (for all future APIs)

Add a reusable guard used by every staff-authenticated route handler:

```typescript
// src/lib/auth/require-staff.ts (suggested)
// 1. Read iron-session
// 2. Verify session.restaurantSlug matches route slug (or body slug)
// 3. Return session or throw 401/403
```

Every `lib/*/service.ts` function that mutates data must accept `restaurantId` as an explicit argument sourced from the authenticated session — not from the request body alone.

---

## Authentication Reference

### Staff login

**Page:** `/r/[slug]/staff`

**API:**

- `POST /api/auth/staff/login`
- `POST /api/auth/staff/logout`
- `GET /api/auth/staff/me`

Login body:

```json
{
  "restaurantSlug": "bole-cafe",
  "email": "waiter@bole.test",
  "password": "password"
}
```

Session cookie payload (iron-session, HTTP-only):

- `staffId`
- `restaurantId`
- `restaurantSlug`
- `role`

### Role guards (already wired in middleware)

| Route prefix | Allowed roles | Public? |
| --- | --- | --- |
| `/r/[slug]/t/[table]` | — | Yes |
| `/r/[slug]/staff` | — | Yes |
| `/r/[slug]/waiter` | `WAITER`, `OWNER` | No |
| `/r/[slug]/kitchen` | `KITCHEN`, `OWNER` | No |
| `/r/[slug]/cashier` | `CASHIER`, `OWNER` | No |
| `/r/[slug]/admin` | `OWNER` | No |
| `/api/auth/staff/*` | — | Yes |
| `/api/restaurants/*/tables/*/bootstrap` | — | Yes |

Unauthorized staff are redirected to `/r/[slug]/staff`. This already works — login API is what unlocks it.

Kitchen uses a shared staff login. Every kitchen mutation in later phases must still write an activity log entry.

---

## Customer Session Device Token

| Concern | Implementation |
| --- | --- |
| Client storage | `localStorage` key `restaurant:{slug}:table:{tableNumber}:deviceToken` |
| Server storage | `Session.deviceTokenHash` (bcrypt hash) |
| Client hook | `src/lib/auth/use-device-token.ts` |
| Hash on write | `src/lib/sessions/service.ts` |
| Compare on read | `src/lib/sessions/queries.ts` |

Rules:

1. If table has no active session, first customer visit creates a session and returns a token.
2. If table has an active customer-started session, bootstrap must receive the matching token.
3. If token is missing or wrong → `sessionState: "active_blocked_device"`.
4. If table has a waiter-started session → `sessionState: "waiter_started"`.
5. When session closes, client clears the localStorage key.

---

## Files to Create in Phase 1

```
src/
  app/api/
    auth/staff/
      login/route.ts          # POST
      logout/route.ts         # POST
      me/route.ts             # GET
    restaurants/[slug]/tables/[tableNumber]/
      bootstrap/route.ts      # GET
    sessions/
      route.ts                # POST
      [sessionId]/
        route.ts              # GET (stub OK)
        close/route.ts        # POST (stub OK)

  lib/
    auth/
      service.ts              # login/logout/me logic
      require-staff.ts        # reusable route guard
      use-device-token.ts     # client localStorage hook
    restaurants/
      service.ts              # isOpen, slug resolution
    sessions/
      queries.ts
      service.ts
    validation/
      staff.ts
      session.ts
```

---

## Foundation Acceptance Checklist

### Already passing (Phase 0)

- [x] Prisma migration runs against PostgreSQL
- [x] Seed creates Bole Cafe, 12 tables, 4 staff, and menu items
- [x] Role guard redirects wrong/unauthenticated staff to `/r/[slug]/staff`
- [x] Tenant layout loads restaurant by slug and applies brand colors
- [x] Prisma Decimals serialized before Client Component props

### Complete in Phase 1

- [ ] Staff login sets an HTTP-only session cookie
- [ ] `GET /api/auth/staff/me` returns the logged-in staff member
- [ ] Staff login page submits to API and redirects by role
- [ ] `GET …/bootstrap` returns restaurant, table, `isOpen`, menu, and `sessionState`
- [ ] Customer device token is generated, hashed server-side, and persisted in `localStorage`
- [ ] Bootstrap returns `active_blocked_device` when token does not match
- [ ] Bootstrap returns `waiter_started` for waiter-opened sessions
- [ ] `POST /api/sessions` creates a customer session with device token
- [ ] Tenant scoping enforced in every new service function (`restaurantId` in WHERE)

### Manual test script

```text
1. Visit /r/bole-cafe/admin → redirected to /r/bole-cafe/staff
2. Login as waiter@bole.test / password → lands on /r/bole-cafe/waiter
3. Logout → cookie cleared, /waiter redirects back to /staff
4. Login as kitchen@bole.test → /kitchen works; /admin redirects to /staff
5. GET /api/restaurants/bole-cafe/tables/1/bootstrap → 200 with menu + sessionState: "none"
6. POST /api/sessions { restaurantSlug, tableNumber: 1 } → returns sessionId + deviceToken
7. Repeat bootstrap with deviceToken query param → sessionState: "active_same_device"
8. Repeat bootstrap without token → sessionState: "active_blocked_device"
```

---

## Next Phase

Once this checklist passes, proceed to **`docs/02-customer-ordering-phase.md`** — customer menu tabs, item drawer, cart, and place order.
