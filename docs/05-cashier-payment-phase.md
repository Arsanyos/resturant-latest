# Phase 6: Cashier and Payment

> **Build order:** In `docs/09-build-order-and-checklists.md`, cashier is **Phase 6**, after Waiter (`docs/04-waiter-phase.md`). Kitchen KDS, order placement, payment recalculation, and customer Pay tab **preview** are already in place.

## Goal

Build `/r/[slug]/cashier` — the payment and session-closing surface. Cashier sees active sessions with bills, records cash (full or partial), finalizes mixed payments, handles mock Telebirr verification failures, and closes sessions. Customer Pay tab gets a working mock Telebirr flow.

## Prerequisites (Phases 0–5 — done / partial)

Do not rebuild unless fixing a bug.

| Item | Location | Status |
| --- | --- | --- |
| Cashier route shell | `src/app/r/[slug]/cashier/page.tsx` | Done (placeholder title only) |
| Staff login + role guard | `middleware.ts`, `requireStaff`, `access_cashier` | Done — `cashier@bole.test` / `password` |
| OWNER on cashier route | `permissions.ts` | Done |
| `Payment` + `PaymentTransaction` models | `prisma/schema.prisma` | Done |
| `recalculateSessionPayment` | `lib/payments/service.ts` | Done — called on place order, cancel, reorder |
| `computeTotals` / `formatETB` | `lib/money/index.ts` | Done — subtotal + service + VAT |
| Orders API returns payment | `GET /api/sessions/[sessionId]/orders` | Done — `payment` block with totals + `status` |
| Customer Pay tab lock | `CustomerShell` → `allItemsServed` | Done — `canPay` false until all items `SERVED` or `CANCELLED` |
| Customer Pay UI preview | `PayScreen.tsx` | Done — shows bill; payment actions show “coming soon” |
| Customer orders poll | `use-orders.ts` | Done — 8s poll; picks up kitchen status changes |
| Kitchen marks served | `PATCH /api/order-items/[itemId]/status` | Done |
| Waiter table `awaiting_payment` chip | `lib/waiter/service.ts` | Done — derived when all items done + `payment.status !== PAID` |
| `use-realtime.ts` + hub `/publish` | `lib/realtime/*`, `ws/index.ts` | Done |
| `SESSION_CLOSED` event | `lib/realtime/events.ts` | Done — emit on close (not wired yet) |
| Session close route stub | `POST /api/sessions/[sessionId]/close` | Stub **501** — implement via finalize in this phase |
| Shared UI | `Money`, `StatusChip`, `AppCard`, `LanguageToggle`, `RoleBadge` | Done — reuse |

### Not built yet (this phase)

| Item | Notes |
| --- | --- |
| Cashier dashboard UI | `features/cashier/*` |
| Cashier sessions list API | `GET /api/restaurants/[slug]/cashier/sessions` |
| Bill detail with transactions | Extend `lib/payments/service.ts` |
| Cash transaction API | `POST /api/payments/transactions` |
| Finalize + session close | `POST /api/payments/finalize` |
| Mock Telebirr (customer) | `POST /api/payments/telebirr/mock` |
| Telebirr verify (cashier) | `POST /api/payments/telebirr/verify` |
| Customer Pay flow | Replace `pay_coming_soon` in `PayScreen` |
| WS events | `payment.updated`, `payment.completed` — add to `events.ts` |
| Receipt view | UI-only print button |

### Demo credentials

| Email | Role | Password |
| --- | --- | --- |
| `cashier@bole.test` | CASHIER | `password` |
| `owner@bole.test` | OWNER | `password` (can access cashier) |

---

## Actor

Cashier:

- Email/password staff login.
- Role: `CASHIER` (middleware). `OWNER` may also open cashier routes.
- Desktop / tablet layout.
- Separate role from waiter — no table assignment required.

---

## Route

```text
/r/[slug]/cashier
```

Protected by middleware — unauthenticated users redirect to `/r/[slug]/staff`.

---

## Payment rules (MVP)

| Rule | Implementation note |
| --- | --- |
| Billing is session-level | One `Payment` row per `Session` (`sessionId` unique) |
| All orders on table in one bill | Sum non-`CANCELLED` `OrderItem` lines in `recalculateSessionPayment` |
| Pay locked until kitchen done | `allItemsServed()` in `order-grouping.ts` — same rule on customer + cashier |
| Full Telebirr success → auto-close | Mock Telebirr sets `PAID`, closes session, emits `payment.completed` + `session.closed` |
| Any cash involvement → cashier finalize | Cash transaction updates `totalPaid`; cashier must call finalize to close |
| One receipt per transaction | `PaymentTransaction` row = one receipt |
| No discounts | Out of scope |

### Payment status enum (`PaymentStatus`)

| Status | Meaning |
| --- | --- |
| `UNPAID` | No successful payments yet |
| `PARTIALLY_PAID` | `totalPaid > 0` but `< totalDue` |
| `PAID` | `totalPaid >= totalDue`; session should be `CLOSED` |

---

## Screen layout

Replace placeholder `cashier/page.tsx` with a client dashboard (mirror `WaiterDashboard` / `KdsBoard` header pattern).

### Header

- Restaurant name (server props).
- Route label: Cashier.
- Staff identity from `GET /api/auth/staff/me`.
- `LanguageToggle` + `RoleBadge`.

### Main areas

| Area | Purpose |
| --- | --- |
| Active sessions list (left) | All `ACTIVE` sessions with payment summary chips |
| Bill detail (center/right) | Selected session — orders, totals, transactions, actions |
| Verification queue (optional rail) | Pending/failed mock Telebirr transactions |

---

## Active sessions list

Each row/card shows:

- Table number + label
- Session age (`startedAt`)
- Order count
- Kitchen completion (`in_kitchen` vs `ready_to_pay`)
- `Payment.status`
- `totalDue`, `totalPaid`, balance (`totalDue - totalPaid`)

### Derived session chips (UI-only)

| Chip | Condition |
| --- | --- |
| `in_kitchen` | Active session; at least one item `PENDING` or `BEING_PREPARED` |
| `ready_to_pay` | All items `SERVED` or `CANCELLED`; `payment.status !== PAID` |
| `partially_paid` | `payment.status === PARTIALLY_PAID` |
| `paid` | `payment.status === PAID` (session should close — hide from list after close) |
| `verification_pending` | Has `PaymentTransaction` with `method = TELEBIRR` and pending/failed verification |

> Waiter grid uses `awaiting_payment` for the same kitchen-complete state — cashier uses `ready_to_pay` per this doc.

---

## Session bill detail

Show:

- Restaurant + table
- Session `startedAt`, `startedByType`
- Orders grouped by `orderNumber` (reuse order shape from `listSessionOrders`)
- Item rows: name, qty, modifiers, notes, `StatusChip`, line total
- Subtotal, service charge, VAT, total due, total paid, balance
- Existing `PaymentTransaction` rows
- Lock message when not all items served:

```text
Payment is locked until all kitchen items are served.
```

Actions (when `ready_to_pay`):

- Record cash (amount + cash tendered)
- Finalize payment (when `totalPaid >= totalDue`)
- View receipt per transaction

---

## Canonical API contracts

> Match `CURSOR-SCAFFOLD-PROMPT.md`. Older drafts used `/api/payments/[paymentId]/transactions/cash` — use flat routes below.

### List cashier sessions — build this phase

```text
GET /api/restaurants/[slug]/cashier/sessions
```

**Auth:** `requireStaff({ restaurantSlug: slug, action: "access_cashier" })`.

Returns active sessions for restaurant with table info, kitchen completion flag, payment summary. Implement in `lib/cashier/queries.ts` + `service.ts`.

### Get session bill — build this phase

Option A (recommended — dedicated bill endpoint):

```text
GET /api/restaurants/[slug]/cashier/sessions/[sessionId]
```

Returns full bill: orders + items + payment + transactions + `canPay` flag.

Option B (extend existing):

```text
GET /api/sessions/[sessionId]/orders
```

Already returns `orders` + `payment` for device token or assigned waiter staff. **Extend** for `access_cashier` staff and include `transactions[]`.

Either way, call `recalculateSessionPayment(sessionId)` before read to ensure totals are fresh.

> Do **not** use `GET /api/sessions/[sessionId]/bill` — not in scaffold.

### Get payment by session — scaffold

```text
GET /api/payments?sessionId={sessionId}
```

Lightweight payment summary only. Prefer cashier bill endpoint for dashboard.

### Record cash transaction — build this phase

```text
POST /api/payments/transactions
```

**Auth:** `requireStaff({ action: "access_cashier" })`.

Body (suggested):

```json
{
  "paymentId": "payment_id",
  "amount": 500,
  "cashTendered": 500
}
```

Server (`lib/payments/service.ts`):

1. Verify session is payable (`allItemsServed` equivalent).
2. Create `PaymentTransaction` with `method = CASH`, `recordedByStaffId`.
3. Update `Payment.totalPaid`; set status `PARTIALLY_PAID` or `PAID` if fully covered.
4. **Do not auto-close session** when cash is involved — cashier must finalize.
5. Audit `CASHIER_RECORDED_CASH`.
6. Emit **`payment.updated`** (add to `events.ts`).

> Do **not** use `POST /api/payments/[paymentId]/transactions/cash`.

### Finalize payment + close session — build this phase

```text
POST /api/payments/finalize
```

Body:

```json
{ "paymentId": "payment_id" }
```

**Auth:** `requireStaff({ action: "access_cashier" })`.

Server:

1. Verify `totalPaid >= totalDue`.
2. Set `Payment.status = PAID`.
3. Set `Session.status = CLOSED`, `endedAt`, `closedByStaffId`.
4. Audit `CASHIER_FINALIZED_PAYMENT`.
5. Emit **`payment.completed`** and **`session.closed`**.

Wire `POST /api/sessions/[sessionId]/close` to call the same finalize logic or return 410 with pointer to finalize — avoid two close paths.

### Mock Telebirr (customer-initiated) — build this phase

```text
POST /api/payments/telebirr/mock
```

**Auth:** customer device token **or** session access (same as place order).

Body (suggested):

```json
{
  "paymentId": "payment_id",
  "amount": 1250,
  "billRefNumber": "BOLE-20260608-0001",
  "simulateFailure": false
}
```

**Success path** (full balance, no failure):

- Create `PaymentTransaction` `method = TELEBIRR`, `telebirrRef`, `status = SUCCESS`.
- `Payment.status = PAID`, `totalPaid = totalDue`.
- Close session automatically (no cashier finalize).
- Emit `payment.completed` + `session.closed`.

**Failure path** (`simulateFailure: true` or amount mismatch):

- Create transaction with `telebirrStatus = PENDING_VERIFICATION` or `FAILED`.
- Emit `payment.updated`.
- Customer sees retry UI; cashier verification queue gets entry.

Implement mock logic in `lib/payments/telebirr-mock.ts`.

### Telebirr manual verification — build this phase

```text
POST /api/payments/telebirr/verify
```

**Auth:** `requireStaff({ action: "access_cashier" })`.

Body:

```json
{
  "transactionId": "txn_id",
  "verified": true
}
```

If verified: apply payment like success path (respect partial vs full). If rejected: mark failed, customer can retry.

---

## Customer Pay tab — extend this phase

`PayScreen.tsx` today:

- Shows bill breakdown from `useOrders` → `payment`
- `canPay` from `CustomerShell` when all items served
- Placeholder: `customer.pay_coming_soon`

Replace placeholder with:

1. Mock Telebirr button (amount = balance).
2. Optional “Pay with cash at counter” message (no PIN on device).
3. Poll `use-orders` or subscribe to `payment.updated` / `session.closed` for live status.
4. On `session.closed`, redirect/bootstrap refresh → session ended state.

Copy for cash:

```text
Pay at the cashier desk. Hand your phone back before any PIN entry.
```

---

## Partial payment examples

### Full cash

```text
Total due: ETB 1250
Cashier records cash: ETB 1250
Cashier clicks Finalize
→ Payment PAID, session CLOSED
```

### Mixed Telebirr + cash

```text
Total due: ETB 1250
Mock Telebirr: ETB 750 (partial — or real partial mock)
Cashier records cash: ETB 500
Cashier clicks Finalize
→ Session closed (cash involved → finalize required)
```

### Full Telebirr (mock success)

```text
Customer mock Telebirr: ETB 1250 (full balance)
→ Auto PAID + session closed — cashier not required
```

---

## Telebirr verification queue

List transactions where `method = TELEBIRR` and `telebirrStatus` in `PENDING_VERIFICATION`, `FAILED`.

Fields: bill ref, table, amount, created time, status.

Actions: **Mark verified** / **Mark failed** / **Ask customer to retry** (UI copy only).

Manual verification note (i18n):

```text
Check merchant account or aggregator dashboard for matching bill reference and amount before marking verified.
```

---

## Receipts

One receipt per `PaymentTransaction`. UI-only print in MVP.

Include: restaurant name, table, transaction ID, method, amount, date/time, Telebirr ref when applicable, cashier name for cash.

---

## WebSocket integration

### Events in `events.ts` today

| Event | Cashier use |
| --- | --- |
| `order.placed` | Refresh session list |
| `order_item.status_changed` | Update `ready_to_pay` state |
| `order_item.cancelled` | Recalculate bill |
| `session.closed` | Remove session from list |
| `session.started` | Add session to list |

### Events to add in this phase

| Event | When |
| --- | --- |
| `payment.updated` | After cash transaction or failed Telebirr |
| `payment.completed` | After full payment + close |

Subscribe via `useRealtime` — same pattern as `use-table-assignments.ts` (stable topic arrays, ignore `subscribed` ack).

Customer Pay tab can poll `use-orders` (8s) until WS is wired on customer shell.

---

## Audit requirements

| Action | Audit `action` string |
| --- | --- |
| Record cash | `CASHIER_RECORDED_CASH` |
| Finalize | `CASHIER_FINALIZED_PAYMENT` |
| Telebirr verify | `CASHIER_VERIFIED_TELEBIRR` |
| Telebirr reject | `CASHIER_REJECTED_TELEBIRR` |
| Mock Telebirr (customer) | `CUSTOMER_TELEBIRR_MOCK` |

---

## Phase 6 implementation steps

### Step 1 — Payments service layer

- Extend `lib/payments/service.ts` — `getSessionBill`, `recordCashTransaction`, `finalizePayment`, `closeSession`
- `lib/payments/telebirr-mock.ts` — mock success/failure
- `lib/cashier/queries.ts` + `service.ts` — session list DTO
- `lib/validation/payment.ts` — Zod schemas

### Step 2 — API routes

```
src/app/api/
  restaurants/[slug]/cashier/
    sessions/route.ts              # GET list
    sessions/[sessionId]/route.ts  # GET bill detail
  payments/
    route.ts                       # GET ?sessionId=
    transactions/route.ts          # POST cash
    finalize/route.ts              # POST
    telebirr/
      mock/route.ts                # POST customer
      verify/route.ts              # POST cashier
```

Update `POST /api/sessions/[sessionId]/close` to delegate to finalize or remove stub.

Add `payment.updated`, `payment.completed` to `events.ts`.

### Step 3 — Cashier hooks + components

| File | Responsibility |
| --- | --- |
| `use-cashier-sessions.ts` | Session list + realtime refetch |
| `use-session-bill.ts` | Bill detail for selected session |
| `SessionList.tsx` | Left panel |
| `BillDetail.tsx` | Orders, totals, transactions |
| `CashPaymentForm.tsx` | Record cash |
| `VerificationQueue.tsx` | Telebirr pending list |
| `ReceiptView.tsx` | Per-transaction receipt |
| `CashierDashboard.tsx` | Layout shell |

### Step 4 — Customer Pay tab

- Extend `PayScreen.tsx` with mock Telebirr + status states
- Handle `session.closed` in `CustomerBootstrapView` / `use-session-status`

### Step 5 — Cashier page + i18n

Replace `cashier/page.tsx`. Add `cashier.*` strings to `messages/en.json` / `am.json`.

---

## Files to create

```
src/
  app/api/
    restaurants/[slug]/cashier/sessions/route.ts
    restaurants/[slug]/cashier/sessions/[sessionId]/route.ts
    payments/route.ts
    payments/transactions/route.ts
    payments/finalize/route.ts
    payments/telebirr/mock/route.ts
    payments/telebirr/verify/route.ts

  features/cashier/
    components/  (see Step 3)
    hooks/
      use-cashier-sessions.ts
      use-session-bill.ts

  lib/cashier/
    queries.ts
    service.ts

  lib/payments/
    telebirr-mock.ts   # new
    service.ts         # extend
    validation in lib/validation/payment.ts
```

Extend:

- `lib/realtime/events.ts`
- `features/customer/components/PayScreen.tsx`
- `app/api/sessions/[sessionId]/close/route.ts`

---

## Acceptance checklist

### Already passing

- [x] `recalculateSessionPayment` updates totals on order/cancel
- [x] Customer Pay tab shows bill breakdown
- [x] Customer Pay locked until all items `SERVED` or `CANCELLED`
- [x] `GET /api/sessions/[sessionId]/orders` returns `payment` block
- [x] Cashier login reaches `/r/bole-cafe/cashier`
- [x] Kitchen serve → customer `canPay` becomes true (after poll)

### Complete in Cashier phase

- [ ] `GET …/cashier/sessions` lists active sessions with correct chips
- [ ] Bill detail shows itemized orders + transactions
- [ ] Cashier records partial cash → `PARTIALLY_PAID`
- [ ] Cashier records remaining cash + finalize → session `CLOSED`
- [ ] Full mock Telebirr from customer auto-closes session
- [ ] Mock Telebirr failure appears in verification queue
- [ ] Cashier verify resolves pending Telebirr
- [ ] `payment.updated` / `payment.completed` / `session.closed` emitted
- [ ] Waiter/cashier lists update without full page refresh

### Manual test script

```text
1. Customer Table 1 → place order → Kitchen serves all items
2. Customer Pay tab → bill visible, mock Telebirr disabled until implemented
3. Login cashier@bole.test → /r/bole-cafe/cashier
4. Table 1 shows ready_to_pay
5. Record ETB partial cash → PARTIALLY_PAID
6. Record remainder + Finalize → session closed, Table 1 leaves list
7. New session Table 2 → full mock Telebirr from customer → auto-close
8. Table 3 → mock Telebirr failure → appears in verification queue → cashier verifies
```

---

## Out of scope (later)

- Real Telebirr API / webhooks
- Discounts, tips, split bills across sessions
- Physical receipt printer integration
- Admin payment reports

---

## Next phase

Proceed to **`docs/06-admin-restaurant-ops-phase.md`** — menu CRUD, inventory, staff, settings, audit log viewer.
