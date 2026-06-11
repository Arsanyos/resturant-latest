# Phase 4: Kitchen KDS

> **Build order:** In `docs/09-build-order-and-checklists.md`, kitchen is **Phase 4**, after **Phase 3 Realtime** (`docs/07-realtime-communication-contracts.md`). Complete realtime subscribe + `order.placed` delivery before expecting KDS to update without manual refresh. Until then, KDS may poll as a fallback (same pattern as customer Orders tab today).

## Goal

Build `/r/[slug]/kitchen`, the kitchen display system. Kitchen staff must see live orders grouped by table, separated by order number, filtered by time window, and advance item statuses `PENDING` → `BEING_PREPARED` → `SERVED`.

## Prerequisites (Phases 0–2 + partial realtime — done / in progress)

Do not rebuild unless fixing a bug.

| Item | Location | Status |
| --- | --- | --- |
| Kitchen route shell | `src/app/r/[slug]/kitchen/page.tsx` | Done (placeholder title only) |
| Staff login + role guard | `src/middleware.ts`, `src/lib/auth/*` | Done — `kitchen@bole.test` / `password` |
| Place order API | `POST /api/sessions/[sessionId]/orders` | Done |
| Order items with `kitchenStatus` | `lib/orders/service.ts` | Done — defaults to `PENDING` |
| `order.placed` emit | `lib/orders/service.ts` → `publishRealtimeEvent` | Done (publisher may no-op until hub `/publish` exists) |
| WS hub process | `ws/hub.ts`, `ws/index.ts` | Done — subscribe by `restaurantId` |
| Realtime event constants | `src/lib/realtime/events.ts` | Done |
| Customer Orders tab | `use-orders.ts` | Done — polls every 8s; upgrade to WS in Phase 3 |
| Shared `StatusChip` | `src/components/shared/StatusChip.tsx` | Done — reuse on KDS |
| `AuditLog` model | `prisma/schema.prisma` | Done — write on kitchen mutations |
| `requireStaff` guard | `src/lib/auth/require-staff.ts` | Done — use with `access_kitchen` |

### Not built yet (this phase + Phase 3)

| Item | Notes |
| --- | --- |
| `lib/realtime/use-realtime.ts` | Phase 3 — client subscribe + refetch |
| `POST /publish` on WS hub | Phase 3 — `publisher.ts` currently targets a missing endpoint |
| Kitchen orders query API | This phase |
| `PATCH /api/order-items/[itemId]/status` | This phase |
| KDS UI components | This phase — `features/kitchen/*` |

### Demo credentials

| Email | Role | Password |
| --- | --- | --- |
| `kitchen@bole.test` | KITCHEN | `password` |
| `owner@bole.test` | OWNER | `password` (also allowed on kitchen route) |

---

## Actor

Kitchen:

- Shared restaurant staff login (`kitchen@bole.test` in seed).
- Role: `KITCHEN` or `OWNER` (middleware + `canActor(role, "access_kitchen")`).
- Tablet / kitchen display layout.
- **Every status mutation must write an `AuditLog` entry** — account is shared.

---

## Route

```text
/r/[slug]/kitchen
```

Example: `/r/bole-cafe/kitchen`

Protected by middleware — unauthenticated users redirect to `/r/[slug]/staff`.

---

## Screen layout

Replace the placeholder `kitchen/page.tsx` with a client KDS dashboard.

### Header

- Restaurant name (from tenant context or API).
- Route label: Kitchen / KDS.
- Time filter segmented control: **All · 60m · 30m · 10m**.
- `RoleBadge` — Kitchen (create in `components/shared/RoleBadge.tsx` if missing).
- `LanguageToggle` — reuse `src/components/shared/LanguageToggle.tsx` + `useLocale`.

### Main area

- **Left / main:** KDS board — table columns or stacked table groups with order cards.
- **Right sidebar:** Activity log (recent kitchen audit entries + live WS hints).

### Empty state

```text
All clear
No pending orders in the current window.
```

Use i18n keys in `messages/en.json` / `messages/am.json`.

---

## KDS grouping

Group by **active table** first. Inside each table, separate **order cards** per `Order.orderNumber`.

Card hierarchy (example — order numbers are **per-session integers** `1`, `2`, `3`, not `1004`):

```text
Table 1
  Order #1 — 7:15 PM
    1× Doro Wat
      Extra injera
      Note: less spicy
      [Pending] [Being prepared] [Served]
```

### Label rules (match customer ordering implementation)

| Field | Source |
| --- | --- |
| Item name | `MenuItem.nameI18nKey` → `t(key, locale)` |
| Variant | `OrderItem.variantId` → `MenuItemVariant.nameI18nKey` |
| Modifiers | `OrderItem.modifiersJson` — array of `{ modifierId, nameI18nKey, priceDelta }` |
| Notes | `OrderItem.notes` |
| Status | `OrderItem.kitchenStatus` enum |

Do not hardcode English item names in API responses — return `nameI18nKey` and resolve on the client.

---

## Canonical API contracts

> Match `CURSOR-SCAFFOLD-PROMPT.md`. Do **not** invent alternate paths.

### Kitchen orders query — build this phase

```text
GET /api/restaurants/[slug]/kitchen/orders?window=all|10|30|60
```

**Auth:** `requireStaff({ restaurantSlug: slug, action: "access_kitchen" })` via iron-session.

**Query:** Active sessions only (`Session.status === ACTIVE`) for the restaurant. Include orders + items for those sessions. Apply time window filter on `Order.createdAt`.

**Response shape:**

```json
{
  "tables": [
    {
      "tableId": "table_id",
      "tableNumber": 1,
      "tableLabel": "Table 1",
      "sessionId": "session_id",
      "orders": [
        {
          "orderId": "order_id",
          "orderNumber": 1,
          "createdAt": "2026-06-09T08:00:00.000Z",
          "items": [
            {
              "orderItemId": "item_id",
              "nameI18nKey": "menu.doro_wat",
              "quantity": 1,
              "variantNameI18nKey": null,
              "modifiers": [
                { "nameI18nKey": "modifier.extra_injera", "priceDelta": 30 }
              ],
              "notes": "less spicy",
              "kitchenStatus": "PENDING",
              "cancelReason": null
            }
          ]
        }
      ]
    }
  ]
}
```

Implementation files:

| File | Responsibility |
| --- | --- |
| `src/lib/kitchen/queries.ts` | Prisma query — active sessions, orders, items, menu joins |
| `src/lib/kitchen/service.ts` | Window filter, grouping, serialization |
| `src/app/api/restaurants/[slug]/kitchen/orders/route.ts` | Thin GET handler |

Include **cancelled** items (`kitchenStatus === CANCELLED`) for audit visibility — render muted with `cancelReason` if set.

### Status transition — build this phase

```text
PATCH /api/order-items/[itemId]/status
```

**Auth:** `requireStaff({ action: "access_kitchen" })` + verify item belongs to staff's `restaurantId` (via session → table → restaurant).

Body:

```json
{ "status": "BEING_PREPARED" }
```

Allowed forward transitions only:

```text
PENDING → BEING_PREPARED → SERVED
```

Cancelled items cannot be advanced. Waiter handles cancellation (Phase 5) via `PATCH /api/order-items/[itemId]/cancel`.

Server behavior (`src/lib/orders/service.ts` or `src/lib/kitchen/service.ts`):

1. Load `OrderItem` with session/table/restaurant chain.
2. Verify staff role `KITCHEN` or `OWNER`.
3. Verify `restaurantId` matches session staff (tenant scoping).
4. Verify transition is allowed.
5. Update `OrderItem.kitchenStatus`.
6. Write `AuditLog`:
   - `entityType`: `"OrderItem"`
   - `entityId`: order item id
   - `action`: `"ORDER_ITEM_STATUS_CHANGED"`
   - `actorType`: `"STAFF"`
   - `actorStaffId`: from session
   - `payloadJson`: `{ from, to, tableNumber, nameI18nKey, orderNumber }`
7. `publishRealtimeEvent` with `order_item.status_changed` (see below).
8. Return updated item.

Route: `src/app/api/order-items/[itemId]/status/route.ts`  
Validation: `src/lib/validation/order.ts` — add `updateOrderItemStatusSchema`.

---

## WebSocket integration

### Event names (implemented in `lib/realtime/events.ts`)

| Constant | Event string | Emitted today? |
| --- | --- | --- |
| `ORDER_PLACED` | `order.placed` | Yes — on place order |
| `ORDER_ITEM_STATUS_CHANGED` | `order_item.status_changed` | No — emit in this phase |
| `SESSION_CLOSED` | `session.closed` | No — cashier phase |
| `ASSISTANCE_CREATED` | `assistance.created` | Yes — on assistance POST |

> Older docs may say `assistance.requested` — the implemented event is **`assistance.created`**.

### Hub subscribe format (implemented)

Clients connect to `WS_HUB_URL` (e.g. `ws://localhost:3001/realtime`) and send:

```json
{
  "type": "subscribe",
  "restaurantId": "cmq6bqbmt0000m1k3xu8nzlmr",
  "topics": ["*"]
}
```

Use `restaurantId` from staff session or restaurant context — **not** slug (hub filters by id).

Envelope shape from server:

```json
{
  "event": "order.placed",
  "restaurantId": "…",
  "payload": {
    "sessionId": "…",
    "orderId": "…",
    "tableNumber": 1,
    "orderNumber": 1
  }
}
```

### KDS client behavior

**After Phase 3 `use-realtime.ts` exists:**

- Subscribe on mount with `restaurantId` + topics `order.placed`, `order_item.status_changed`, `session.closed`.
- On any matching event → **refetch** `GET …/kitchen/orders` (do not trust payload as source of truth).
- Exponential backoff reconnect per `docs/07`.

**Until Phase 3 is complete:** poll kitchen orders every 8–10s (same as `use-orders.ts`).

### Publisher gap (Phase 3)

`src/lib/realtime/publisher.ts` POSTs to `http://localhost:3001/publish`, but `ws/index.ts` only exposes `/health` today. Phase 3 must add `/publish` to the hub before WS events reach clients. Kitchen phase should still call `publishRealtimeEvent` so wiring is ready.

---

## Activity log sidebar

Show recent kitchen-relevant `AuditLog` rows for the restaurant:

- New order received (optional — can also log on `order.placed` handler).
- Item → Being prepared.
- Item → Served.

Entry format:

```text
7:16 PM — Table 1 — Doro Wat moved to Being prepared
```

Query: `AuditLog` where `restaurantId` + `action = ORDER_ITEM_STATUS_CHANGED` (and optionally order.placed), ordered by `createdAt desc`, limit 50.

Alternatively append to an in-memory ring buffer when WS events arrive — but **audit table is source of truth** for persisted history.

Show shared-login notice at top of sidebar (i18n string).

---

## Time filter rules

Filter on **`Order.createdAt`**, not item status change time.

| `window` param | Rule |
| --- | --- |
| `all` | All orders in active sessions |
| `60` | `createdAt >= now - 60 minutes` |
| `30` | `createdAt >= now - 30 minutes` |
| `10` | `createdAt >= now - 10 minutes` |

If no orders match the window, show **All clear** empty state (even if older orders exist outside window).

---

## UI requirements

Reuse design tokens from `src/app/globals.css`:

- Large tap targets for status action buttons.
- Reuse `StatusChip` for current state display.
- **Pending** — prominent orange/warning (`StatusChip` already maps `PENDING` → warning).
- **Being prepared** — navy/amber emphasis.
- **Served** — green/success.
- **Cancelled** — muted; show `cancelReason` on tap or subtitle.
- Avoid dense text — scan-friendly layout per `docs/08-ui-design-system-pixel-guide.md`.

---

## Phase 4 implementation steps

Work in order.

### Step 1 — Kitchen data layer

- `src/lib/kitchen/queries.ts`
- `src/lib/kitchen/service.ts`
- `GET /api/restaurants/[slug]/kitchen/orders/route.ts`

### Step 2 — Status mutation API

- Extend `src/lib/validation/order.ts`
- `updateOrderItemStatus` in service layer with audit + WS emit
- `PATCH /api/order-items/[itemId]/status/route.ts`

### Step 3 — KDS hooks

| File | Responsibility |
| --- | --- |
| `src/features/kitchen/hooks/use-kds-orders.ts` | Fetch + poll; wire `use-realtime` when Phase 3 lands |
| `src/features/kitchen/hooks/use-kitchen-activity.ts` | Fetch audit log entries |

### Step 4 — KDS components

| File | Responsibility |
| --- | --- |
| `KdsBoard.tsx` | Main layout |
| `TableColumn.tsx` | Table group |
| `OrderCard.tsx` | Order # + timestamp |
| `OrderItemRow.tsx` | Item line + modifiers/notes |
| `StatusActionButton.tsx` | Advance status (large touch) |
| `TimeFilter.tsx` | Segmented control |
| `ActivityLogSidebar.tsx` | Audit + shared-login notice |

### Step 5 — Kitchen page

Replace `src/app/r/[slug]/kitchen/page.tsx` with client wrapper mounting `KdsBoard`.

### Step 6 — i18n

Add kitchen strings: empty state, time filters, activity log templates, shared-login notice.

---

## Files to create

```
src/
  app/api/
    restaurants/[slug]/kitchen/orders/route.ts   # GET
    order-items/[itemId]/status/route.ts         # PATCH

  features/kitchen/
    components/
      KdsBoard.tsx
      TableColumn.tsx
      OrderCard.tsx
      OrderItemRow.tsx
      StatusActionButton.tsx
      TimeFilter.tsx
      ActivityLogSidebar.tsx
    hooks/
      use-kds-orders.ts
      use-kitchen-activity.ts

  lib/
    kitchen/
      queries.ts
      service.ts
```

Extend:

- `src/lib/validation/order.ts`
- `src/lib/orders/service.ts` (or keep kitchen mutations in `lib/kitchen/service.ts`)
- `messages/en.json`, `messages/am.json`

---

## Downstream effects (already wired on customer side)

When kitchen marks items `SERVED`:

- Customer **Orders** tab shows updated `StatusChip` (poll or WS refetch).
- Customer **Pay** tab enables when `allItemsServed()` in `order-grouping.ts` returns true — all items `SERVED` or `CANCELLED`.
- Cashier bill totals already recalculate on place order; status changes do not change totals.

---

## Acceptance checklist

### Prerequisites from earlier phases

- [x] Customer can place order → `OrderItem` rows with `PENDING`
- [x] `order.placed` called from place-order service
- [x] Staff can login as `kitchen@bole.test` and reach `/kitchen`
- [ ] WS events reach clients (Phase 3)
- [ ] Hub `/publish` endpoint (Phase 3)

### Complete in Kitchen phase

- [ ] `GET …/kitchen/orders` returns active sessions grouped by table/order
- [ ] Time filters work on `Order.createdAt`
- [ ] KDS shows order number + timestamp per card
- [ ] Status buttons advance `PENDING` → `BEING_PREPARED` → `SERVED`
- [ ] Cancelled items visible but not advanceable
- [ ] Each status change writes `AuditLog`
- [ ] `order_item.status_changed` published after PATCH
- [ ] Activity log sidebar shows recent changes
- [ ] Customer Orders tab shows Served after kitchen action (poll or WS)
- [ ] Customer Pay tab enables when all items served

### Manual test script

```text
1. Login as kitchen@bole.test → /r/bole-cafe/kitchen
2. From another browser: /r/bole-cafe/t/3 → place Doro Wat
3. KDS shows Table 3 / Order #N without manual page refresh (after Phase 3 WS; poll OK until then)
4. Tap Being prepared → audit log entry + customer Orders updates
5. Tap Served → customer Pay tab becomes eligible when all items served
6. Set time filter 10m — old orders outside window hidden; empty state if none match
```

---

## Out of scope (later phases)

- Waiter cancel item (`PATCH /api/order-items/[itemId]/cancel`) — Phase 5
- Session close / remove table from KDS (`session.closed`) — cashier phase
- Inventory / recipe deduction on serve
- Multiple kitchen stations

---

## Next phases

| After kitchen | Doc |
| --- | --- |
| Realtime client (if not done first) | `docs/07-realtime-communication-contracts.md` |
| Waiter dashboard | `docs/04-waiter-phase.md` |
| Cashier + session close | `docs/05-cashier-payment-phase.md` |
