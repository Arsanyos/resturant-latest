# Phase 5: Waiter Dashboard

> **Build order:** In `docs/09-build-order-and-checklists.md`, waiter is **Phase 5**, after Kitchen KDS (`docs/03-kitchen-kds-phase.md`) and realtime (`docs/07-realtime-communication-contracts.md`). Customer ordering, kitchen status flow, and assistance **creation** are already in place.

## Goal

Build `/r/[slug]/waiter` — the staff surface for helping guests. Waiters view all tables, self-assign (or use owner assignments), open waiter-started sessions, respond to assistance requests, and place/edit/cancel orders on assigned tables with full audit logging.

## Prerequisites (Phases 0–4 — done / partial)

Do not rebuild unless fixing a bug.

| Item | Location | Status |
| --- | --- | --- |
| Waiter route shell | `src/app/r/[slug]/waiter/page.tsx` | Done (placeholder title only) |
| Staff login + role guard | `middleware.ts`, `requireStaff`, `access_waiter` | Done — `waiter@bole.test` / `password` |
| OWNER on waiter route | `permissions.ts` | Done — OWNER may access waiter |
| 12 seeded tables | `prisma/seed.ts` | Done |
| Customer session + device token | `lib/sessions/service.ts` | Done — `CUSTOMER` sessions only |
| `waiter_started` bootstrap state | `resolveSessionState` | Done — when `startedByType === WAITER` |
| Customer blocked / waiter UI | `BlockedDeviceScreen`, `WaiterSessionMessage` | Done |
| Create assistance (customer) | `POST /api/sessions/[sessionId]/assistance` | Done |
| Assistance WS emit | `assistance.created` | Done |
| Place order API | `POST /api/sessions/[sessionId]/orders` | Done — no device token for `WAITER` sessions |
| Kitchen status API | `PATCH /api/order-items/[itemId]/status` | Done |
| Shared UI | `StatusChip`, `LanguageToggle`, `RoleBadge`, customer `ItemDrawer` pattern | Done — reuse/extend |
| `use-realtime.ts` + hub `/publish` | `lib/realtime/use-realtime.ts`, `ws/index.ts` | Done |
| `AuditLog` model | `prisma/schema.prisma` | Done |
| `StaffTableAssignment` model | `prisma/schema.prisma` | Done — no API yet |

### Not built yet (this phase)

| Item | Notes |
| --- | --- |
| Waiter dashboard UI | `features/waiter/*` |
| Table grid + detail panel | This phase |
| Self-assign / owner assign API | `POST /api/staff/assignments` |
| Waiter-started session API | Extend `lib/sessions/service.ts` |
| Assistance inbox + acknowledge/resolve | `GET` list + `PATCH /api/assistance/[requestId]` |
| Cancel item API | `PATCH /api/order-items/[itemId]/cancel` |
| Waiter order with `takenByStaffId` + audit | Extend `placeOrder` |
| Reorder API | New route or reuse place order |
| WS events: `table.assignment_changed`, `order_item.cancelled` | Add to `events.ts` when implementing |

### Demo credentials

| Email | Role | Password |
| --- | --- | --- |
| `waiter@bole.test` | WAITER | `password` |
| `owner@bole.test` | OWNER | `password` (can assign tables + access waiter) |

---

## Actor

Waiter:

- Email/password staff login.
- Role: `WAITER` (middleware). `OWNER` may also open waiter routes.
- Tablet-first dashboard.
- Can **see** all tables; can **mutate** only assigned or self-assigned tables.

---

## Route

```text
/r/[slug]/waiter
```

Protected by middleware — unauthenticated users redirect to `/r/[slug]/staff`.

---

## Screen layout

Replace placeholder `waiter/page.tsx` with a client dashboard.

### Header

- Restaurant name (from server props or `RestaurantProvider`).
- Route label: Waiter.
- Staff identity from `GET /api/auth/staff/me`.
- `LanguageToggle` + `RoleBadge`.

### Main areas

| Area | Purpose |
| --- | --- |
| Table grid | All tables with status chips |
| Assistance inbox | Pending assistance requests |
| Table detail panel | Drawer/modal — session, orders, actions |

Reuse warm cream / orange / navy tokens from `globals.css`.

---

## Table grid

Each table card shows:

- Table number + label (`Table.label`)
- Capacity
- Session state (derived — see below)
- Assigned waiter name (from today's `StaffTableAssignment`)
- Status chip
- Assistance badge if pending request for table
- Payment hint if session has unpaid `Payment` and items served

### Derived table status (UI-only enum)

Map from DB state — not a separate column:

| Chip | Condition |
| --- | --- |
| `idle` | No active session |
| `active` | Active session, kitchen in progress |
| `awaiting_payment` | Active session, all items `SERVED` or `CANCELLED`, payment not `PAID` |
| `assistance_requested` | Pending `WaiterAssistanceRequest` for table |
| `closed` | No active session after recent close (optional; usually same as `idle`) |

Waiters may **click any table** to open detail. Mutation buttons disabled unless table is assigned to current waiter (or self-assigned today).

---

## Canonical API contracts

> Match `CURSOR-SCAFFOLD-PROMPT.md`. Older drafts used different paths — use these.

### Waiter tables overview — build this phase

No route exists yet. Suggested:

```text
GET /api/restaurants/[slug]/waiter/tables
```

**Auth:** `requireStaff({ restaurantSlug: slug, action: "access_waiter" })`.

Returns all active tables for restaurant with: session summary, assignment, pending assistance flag, payment status. Implement in `lib/waiter/queries.ts` + `service.ts`.

### Self-assign / owner assign table

```text
POST /api/staff/assignments
```

**Auth:** waiter for self-assign; owner for assigning others.

Body (suggested):

```json
{
  "tableId": "table_id",
  "staffId": "optional — owner assigns; omit for self-assign"
}
```

Server:

1. Verify staff belongs to restaurant.
2. Upsert `StaffTableAssignment` for `shiftDate = start of today` (restaurant timezone).
3. Write `AuditLog` — `WAITER_SELF_ASSIGNED_TABLE` or `OWNER_ASSIGNED_TABLE`.
4. Emit new event `table.assignment_changed` (add to `lib/realtime/events.ts`).

> Do **not** use `POST /api/tables/[tableId]/assignments/self` — not in scaffold.

### Assistance — create (done)

```text
POST /api/sessions/[sessionId]/assistance
```

Implemented in `lib/orders/service.ts` → `createAssistanceRequest`. Customer `BlockedDeviceScreen` / `WaiterSessionMessage` call this.

Body: `{ "deviceInfo": "...", "tableId": "..." }`  
Emits: **`assistance.created`** (not `assistance.requested`).

### Assistance — list + update — build this phase

```text
GET /api/restaurants/[slug]/waiter/assistance
PATCH /api/assistance/[requestId]
```

> Do **not** use `GET /api/restaurants/[slug]/assistance-requests` or `PATCH /api/assistance-requests/[id]`.

**GET:** Pending + recent requests for restaurant (`WaiterAssistanceRequest` joined to `Table`).

**PATCH body:**

```json
{ "status": "ACKNOWLEDGED" }
```

or `RESOLVED`. Set `acknowledgedByStaffId`. Emit **`assistance.updated`**. Audit log required.

### Waiter-started session — build this phase

Customer `POST /api/sessions` only creates `CUSTOMER` sessions with device tokens.

Add staff-authenticated endpoint (suggested):

```text
POST /api/sessions/waiter
```

Body:

```json
{
  "restaurantSlug": "bole-cafe",
  "tableNumber": 1
}
```

**Auth:** `requireStaff({ action: "access_waiter" })` + table must be assigned/self-assigned to waiter (or OWNER bypass).

Server (`lib/sessions/service.ts` → `createWaiterSession`):

1. Verify no active session on table.
2. Create `Session` with `startedByType = WAITER`, `startedByStaffId`, `deviceTokenHash = null`.
3. Audit `WAITER_OPENED_SESSION`.
4. Emit `session.started` (add to `events.ts`) or rely on waiter table refetch.

Customer bootstrap then returns `sessionState: "waiter_started"` (already implemented).

> Do **not** use `POST /api/restaurants/[slug]/tables/[table]/sessions/waiter` — not in scaffold.

### Place order (reuse + extend)

```text
POST /api/sessions/[sessionId]/orders
```

Already implemented. For **`WAITER`-started sessions**, no `x-device-token` header is required (`assertSessionAccess` in `lib/orders/service.ts`).

**Waiter phase extensions:**

1. Accept staff cookie auth as alternative for **customer-started** sessions on **assigned** tables (waiter assisting guest).
2. Set `Order.takenByStaffId` when placed by waiter.
3. Audit `WAITER_PLACED_ORDER`.
4. Reuse existing `order.placed` emit.

Reuse customer cart/item shape from `lib/validation/order.ts` (`placeOrderSchema`).

### Cancel item — build this phase

```text
PATCH /api/order-items/[itemId]/cancel
```

Body:

```json
{ "reason": "Customer changed mind before food arrived" }
```

**Auth:** `requireStaff({ action: "access_waiter" })` + assigned table + valid status rules.

Server: set `kitchenStatus = CANCELLED`, `cancelledAt`, `cancelledByStaffId`, `cancelReason`; recalculate payment; audit; emit **`order_item.cancelled`** (add to `events.ts`).

### Edit pending item — build this phase

Scaffold has **no** generic `PATCH /api/order-items/[itemId]`. Options:

1. **Recommended:** Cancel + add new line via place order (simpler, full audit trail).
2. **Optional:** Add `PATCH /api/order-items/[itemId]` for quantity/modifiers/notes on `PENDING` items only.

If adding PATCH, keep in `lib/orders/service.ts` with audit before/after in `payloadJson`.

### Reorder — build this phase

Scaffold has no `POST …/orders/reorder`. Implement as:

```text
POST /api/sessions/[sessionId]/orders/reorder
```

Body:

```json
{
  "sourceOrderItemId": "served_item_id",
  "reason": "Customer requested replacement"
}
```

Creates **new** `OrderItem` on a new or same `Order` — do not mutate served item. Audit `WAITER_REORDERED_ITEM`.

Alternatively: waiter uses place order with same menu payload (MVP shortcut).

---

## Edit and cancel rules

| `kitchenStatus` | Waiter action (assigned table only) |
| --- | --- |
| `PENDING` | Edit (if PATCH implemented) or cancel |
| `BEING_PREPARED` | Cancel with reason |
| `SERVED` | Cancel with reason; prefer reorder as new item |
| `CANCELLED` | No further changes |

Customer can still edit/cancel pending items on their device; waiter overrides on assigned tables.

---

## Waiter ordering UI

Reuse customer patterns where possible:

| Reuse from customer | Waiter-specific |
| --- | --- |
| `CategoryTabs`, `MenuItemCard`, `ItemDrawer` | Table context in header |
| `use-cart.ts` pattern | `WaiterOrderForm` in detail panel |
| `placeOrderSchema` | Staff auth headers, no device token |

Load menu via bootstrap menu query or `GET /api/menu` (admin route — prefer dedicated waiter menu slice from `getMenuForBootstrap` logic).

---

## Telebirr assist (UI only this phase)

Waiter guides customer on **customer Pay tab** on customer's phone.

- No PIN entry on waiter device.
- Copy (i18n): `Hand the phone back to the customer before PIN entry.`
- Full mock Telebirr remains cashier/customer payment phase.

---

## WebSocket integration

### Events in `lib/realtime/events.ts` today

| Event | Used by waiter? |
| --- | --- |
| `order.placed` | Yes — refresh table grid |
| `order_item.status_changed` | Yes — update table/order status |
| `assistance.created` | Yes — inbox badge |
| `assistance.updated` | Yes — after PATCH |
| `session.closed` | Yes — table returns to idle |

### Events to add in this phase

| Event | When |
| --- | --- |
| `table.assignment_changed` | After `POST /api/staff/assignments` |
| `order_item.cancelled` | After cancel PATCH |
| `session.started` | Optional — waiter opens session |

Subscribe via `useRealtime({ restaurantId, onEvent: refetch })` — same pattern as `use-kds-orders.ts`.

> Older docs reference `assistance.requested`, `session.updated`, `payment.updated` — only add payment events when cashier phase lands; use **`assistance.created`** now.

---

## Audit requirements

Every waiter mutation writes `AuditLog` with `restaurantId`, `actorStaffId`, `entityType`, `entityId`, `action`, `payloadJson`.

| Action | Audit `action` string |
| --- | --- |
| Self-assign | `WAITER_SELF_ASSIGNED_TABLE` |
| Owner assign | `OWNER_ASSIGNED_TABLE` |
| Open waiter session | `WAITER_OPENED_SESSION` |
| Place order | `WAITER_PLACED_ORDER` |
| Edit item | `WAITER_EDITED_ORDER_ITEM` |
| Cancel item | `WAITER_CANCELLED_ORDER_ITEM` |
| Reorder | `WAITER_REORDERED_ITEM` |
| Acknowledge assistance | `ASSISTANCE_ACKNOWLEDGED` |
| Resolve assistance | `ASSISTANCE_RESOLVED` |

Include before/after in `payloadJson` when values change.

---

## Phase 5 implementation steps

### Step 1 — Waiter data layer

- `src/lib/waiter/queries.ts` — tables, assignments, assistance
- `src/lib/waiter/service.ts` — grid DTO, assignment, assistance patch
- `GET /api/restaurants/[slug]/waiter/tables/route.ts`
- `GET /api/restaurants/[slug]/waiter/assistance/route.ts`

### Step 2 — Assignments + waiter sessions

- `POST /api/staff/assignments/route.ts`
- `createWaiterSession` in `lib/sessions/service.ts`
- `POST /api/sessions/waiter/route.ts` (or extend sessions route with staff branch)
- Add `table.assignment_changed`, `session.started` to `events.ts`

### Step 3 — Cancel + reorder

- `PATCH /api/order-items/[itemId]/cancel/route.ts`
- `POST /api/sessions/[sessionId]/orders/reorder/route.ts` (or document place-order shortcut)
- `PATCH /api/assistance/[requestId]/route.ts`
- Extend `placeOrder` for `takenByStaffId` + waiter auth on assigned customer sessions

### Step 4 — Waiter hooks

| File | Responsibility |
| --- | --- |
| `use-table-assignments.ts` | Grid data + refetch |
| `use-assistance-requests.ts` | Inbox + acknowledge |

Wire `useRealtime` for refetch (poll fallback 10s).

### Step 5 — Waiter components

| File | Responsibility |
| --- | --- |
| `TableGrid.tsx` | All tables |
| `TableStatusCard.tsx` | Single table card |
| `TableDetailPanel.tsx` | Drawer with session/orders |
| `AssistanceInbox.tsx` | Request list |
| `SelfAssignButton.tsx` | Assign CTA |
| `WaiterOrderForm.tsx` | Menu + cart + place order |
| `WaiterDashboard.tsx` | Layout shell |

### Step 6 — Waiter page + i18n

Replace `waiter/page.tsx`. Add strings to `messages/en.json` / `am.json`.

---

## Files to create

```
src/
  app/api/
    restaurants/[slug]/waiter/
      tables/route.ts          # GET
      assistance/route.ts      # GET
    staff/assignments/route.ts   # POST
    sessions/waiter/route.ts     # POST — waiter-started session
    assistance/[requestId]/route.ts  # PATCH
    order-items/[itemId]/cancel/route.ts  # PATCH
    sessions/[sessionId]/orders/reorder/route.ts  # POST (optional)

  features/waiter/
    components/  (see Step 5)
    hooks/
      use-table-assignments.ts
      use-assistance-requests.ts

  lib/waiter/
    queries.ts
    service.ts
```

Extend:

- `lib/sessions/service.ts`
- `lib/orders/service.ts`
- `lib/realtime/events.ts`
- `lib/validation/session.ts`, `order.ts`

---

## Acceptance checklist

### Already passing

- [x] Waiter login reaches `/r/bole-cafe/waiter`
- [x] Customer assistance POST creates `WaiterAssistanceRequest`
- [x] `assistance.created` emitted
- [x] Customer sees `waiter_started` when session is `WAITER` type (once API exists)
- [x] Place order works without device token on waiter-started sessions
- [x] Kitchen receives orders from waiter-placed orders (same `order.placed` path)

### Complete in Waiter phase

- [ ] `GET …/waiter/tables` shows all 12 tables with correct status chips
- [ ] Waiter self-assigns Table 1 via `POST /api/staff/assignments`
- [ ] Waiter opens waiter-started session on assigned table
- [ ] Customer scan shows waiter-opened message
- [ ] Waiter places order with `takenByStaffId` set
- [ ] Kitchen sees order without refresh (WS or poll)
- [ ] Assistance inbox shows blocked-device requests
- [ ] Acknowledge/resolve assistance updates status + audit
- [ ] Cancel pending item with reason + audit + `order_item.cancelled`
- [ ] Unassigned table detail is read-only with self-assign CTA

### Manual test script

```text
1. Login as waiter@bole.test → /r/bole-cafe/waiter
2. See 12 tables; self-assign Table 1
3. Open waiter-started session on Table 1
4. Customer scan /r/bole-cafe/t/1 → waiter_started message
5. Waiter adds Doro Wat + place order → Kitchen KDS shows Table 1
6. Customer on Table 2 (blocked device) → request assistance → appears in waiter inbox
7. Acknowledge assistance → audit log entry
8. Cancel a pending item with reason → customer Orders updates
```

---

## Out of scope (later phases)

- Owner admin UI for shift assignments (use API directly or admin phase)
- Cashier payment / `payment.updated` on waiter grid
- Real Telebirr on waiter device
- Printed receipts

---

## Next phase

Proceed to **`docs/05-cashier-payment-phase.md`** — billing, cash/Telebirr mock, session close (`session.closed`).
