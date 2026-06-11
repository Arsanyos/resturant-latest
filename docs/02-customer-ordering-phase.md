# Phase 2: Customer Ordering

## Goal

Complete the customer QR flow at `/r/[slug]/t/[table]`. Phase 1 delivered bootstrap, session creation, and device-token binding. **Phase 2 replaces the temporary menu preview with the full customer shell** — tabs, item drawer, cart, place order, and orders history. Pay tab shows a **disabled state only**; mock Telebirr and session close belong to the cashier/payment phase.

## Prerequisites (Phase 0 + Phase 1 — done)

Do not rebuild these unless fixing a bug.

| Item | Location | Status |
| --- | --- | --- |
| Customer route shell | `src/app/r/[slug]/t/[table]/page.tsx` | Done |
| Bootstrap + session gate UI | `src/features/customer/components/CustomerBootstrapView.tsx` | Done (partial — see below) |
| Device token hook | `src/lib/auth/use-device-token.ts` | Done |
| Bootstrap API | `GET /api/restaurants/[slug]/tables/[tableNumber]/bootstrap` | Done |
| Create session API | `POST /api/sessions` | Done |
| Get session API | `GET /api/sessions/[sessionId]` | Done |
| Session close API | `POST /api/sessions/[sessionId]/close` | Stub (501) |
| Menu in bootstrap | `src/lib/restaurants/queries.ts` → `getMenuForBootstrap` | Done |
| Session state resolution | `src/lib/sessions/service.ts` → `resolveSessionState` | Done |
| Device token hash/compare | bcrypt via `src/lib/auth/password.ts` | Done |
| Tenant layout + brand colors | `src/app/r/[slug]/layout.tsx` | Done |
| i18n | `messages/en.json`, `messages/am.json` | Done (extend in Phase 2) |
| Design tokens | `src/app/globals.css` | Done |

### What `CustomerBootstrapView` already does

| `sessionState` | Current UI | Phase 2 change |
| --- | --- | --- |
| `none` | "Start ordering" CTA → `POST /api/sessions` | Keep; then mount full shell |
| `active_same_device` | Flat menu list preview | Replace with tabbed shell (Menu/Cart/Orders/Pay) |
| `active_blocked_device` | Blocked message | Add assistance button; use copy below |
| `waiter_started` | Waiter message | Add assistance button; allow browse-only shell |
| Restaurant closed | Closed message | Keep; shell may still show existing orders later |

**Refactor plan:** Extract session-gate screens (`none`, blocked, waiter, closed) into `BlockedDeviceScreen`, `WaiterSessionMessage`, etc. Move the active-session experience into `MenuPage` + shell. `CustomerBootstrapView` becomes a thin router/wrapper.

### Local dev note — stale sessions

If bootstrap returns `active_blocked_device` on a table you never started in **this** browser, an orphaned `ACTIVE` session likely exists in the DB (e.g. from API testing). Fix:

```bash
# Use another table, e.g. /r/bole-cafe/t/2
# Or close the session in psql / Prisma Studio
```

Only the browser that called `POST /api/sessions` and saved `deviceToken` to `localStorage` gets `active_same_device`.

---

## Actor

Customer:

- No account.
- Mobile-first browser UI.
- Identified by restaurant slug, table number, and browser `deviceToken` in `localStorage`.

**Storage key (implemented):**

```text
restaurant:{slug}:table:{tableNumber}:deviceToken
```

---

## Route

```text
/r/[slug]/t/[table]
```

Example: `/r/bole-cafe/t/1`

---

## Canonical API contracts (use these paths)

> **Important:** Older drafts of this doc used different URLs (`x-device-token` header only, `POST …/sessions/customer`, `POST /api/tables/…/assistance-requests`). The **implemented and canonical** paths are below. Match `CURSOR-SCAFFOLD-PROMPT.md` for any new routes.

### Bootstrap — done

```text
GET /api/restaurants/[slug]/tables/[tableNumber]/bootstrap?deviceToken={optional}
```

- Device token is passed as a **query param** `deviceToken` (not a header) — this is what `CustomerBootstrapView` uses today.
- Response includes categorized `menu`, `isOpen`, `sessionState`, `sessionId`.

Actual menu shape (categories with nested items):

```json
{
  "restaurant": { "id": "…", "slug": "bole-cafe", "name": "Bole Cafe", "logoUrl": null, "primaryColor": "#F97316", "secondaryColor": "#111827", "currency": "ETB" },
  "table": { "id": "…", "number": 1, "label": "Table 1" },
  "isOpen": true,
  "sessionState": "active_same_device",
  "sessionId": "…",
  "deviceToken": null,
  "menu": [
    {
      "id": "category_id",
      "sortOrder": 1,
      "i18nKey": "category.traditional",
      "items": [
        {
          "id": "item_id",
          "nameI18nKey": "menu.doro_wat",
          "descriptionI18nKey": "menu.doro_wat_desc",
          "basePrice": 380,
          "imageUrl": null,
          "variants": [],
          "modifiers": [{ "id": "…", "nameI18nKey": "modifier.extra_injera", "priceDelta": 30, "isRequired": false }]
        }
      ]
    }
  ]
}
```

All prices are **numbers** (Decimals serialized server-side). Labels use `i18nKey` — resolve with `t(key, locale)` on the client.

### Create customer session — done

```text
POST /api/sessions
```

Body:

```json
{ "restaurantSlug": "bole-cafe", "tableNumber": 1 }
```

Response:

```json
{
  "sessionId": "session_id",
  "deviceToken": "plain_token_returned_once",
  "sessionState": "active_same_device"
}
```

Client must call `setToken(deviceToken)` via `useDeviceToken` immediately after success.

Returns `409` if table already has an active session.

### Place order — build in Phase 2

```text
POST /api/sessions/[sessionId]/orders
```

Auth for customer-started sessions: pass device token via **`x-device-token` header** (preferred for POST) or validate in request body — pick one and use consistently in `lib/orders/service.ts`.

Body:

```json
{
  "items": [
    {
      "menuItemId": "item_id",
      "variantId": null,
      "quantity": 1,
      "modifiers": [
        { "modifierId": "modifier_id", "nameI18nKey": "modifier.extra_injera", "priceDelta": 30 }
      ],
      "notes": "less spicy"
    }
  ]
}
```

Store `modifiers` on `OrderItem.modifiersJson` with resolved names or i18n keys + price deltas.

Server behavior (`lib/orders/service.ts`):

1. Load session; verify `ACTIVE`.
2. Verify `deviceToken` for `startedByType === CUSTOMER` (reuse `verifyDeviceToken` from `lib/sessions/queries.ts`).
3. Verify restaurant is open (`computeIsOpen`).
4. Verify every menu item is available (`manualAvailable && derivedAvailable`).
5. Compute `unitPrice` = base + variant delta + modifier deltas.
6. Create new `Order` with incremented `orderNumber` per session.
7. Create `OrderItem` rows with `kitchenStatus = PENDING`.
8. Upsert/recalculate session `Payment` (subtotal, tax, service, totalDue).
9. Call `publishRealtimeEvent` with `order.placed` (kitchen auto-refresh completes in Phase 3; emit now so the hook is ready).
10. Return the created order with items.

Route handler: `src/app/api/sessions/[sessionId]/orders/route.ts` — validate with `lib/validation/order.ts`, delegate to service.

### List session orders — build in Phase 2

No dedicated route exists yet. Either:

- **`GET /api/sessions/[sessionId]/orders`** (add this route), or
- Extend `GET /api/sessions/[sessionId]` to include `orders` + `items`.

Orders tab needs: `orderNumber`, `createdAt`, items with `kitchenStatus`, `menuItem` i18n keys.

### Request waiter assistance — build in Phase 2

Canonical path per scaffold:

```text
POST /api/sessions/[sessionId]/assistance
```

Body:

```json
{
  "deviceInfo": "optional browser summary"
}
```

Also support blocked-device flow where `sessionId` may be unknown — add query/body `tableId` or resolve table from bootstrap `table.id`.

Server: create `WaiterAssistanceRequest`, `publishRealtimeEvent` with `assistance.created` (from `lib/realtime/events.ts`).

> Do **not** use `POST /api/tables/[tableId]/assistance-requests` — that path is not in the scaffold.

---

## Phase 2 implementation steps

Work in order. Each step should compile and be manually testable.

### Step 1 — Shared customer primitives

Create under `src/components/shared/` (if missing):

| Component | Purpose |
| --- | --- |
| `RestaurantHeader.tsx` | Brand, name, table label |
| `LanguageToggle.tsx` | EN/AM, persist `localStorage` locale key |
| `StatusChip.tsx` | Kitchen status labels |
| `Money.tsx` | ETB formatting via `lib/money` |
| `AppCard.tsx` | Consistent card wrapper |

Create `src/lib/money/index.ts`: `formatETB`, `parseETB`, `computeTotals(subtotal, taxPct, servicePct)`.

### Step 2 — Customer shell + tab navigation

| File | Responsibility |
| --- | --- |
| `src/features/customer/components/CustomerShell.tsx` | Header + tab bar (Menu, Cart, Orders, Pay) |
| `src/features/customer/hooks/use-session-status.ts` | Wrap bootstrap fetch; expose `sessionState`, `sessionId`, `menu`, `isOpen` |
| Refactor `CustomerBootstrapView.tsx` | Gate → shell handoff when `active_same_device` or `waiter_started` |

Design: centered column max ~430–520px; selected tab = navy pill; use CSS variables from `globals.css`.

### Step 3 — Menu tab

| File | Responsibility |
| --- | --- |
| `CategoryTabs.tsx` | Horizontal scroll; active = orange |
| `MenuItemCard.tsx` | Name, description, price, add button |
| `MenuPage.tsx` | Category tabs + item grid; open drawer on click |

Reuse bootstrap menu data; unavailable items (`manualAvailable` or `derivedAvailable` false) are already filtered server-side.

### Step 4 — Item drawer + cart state

| File | Responsibility |
| --- | --- |
| `ItemDrawer.tsx` | Variants, modifiers, notes, qty stepper, sticky "Add to cart — ETB X" |
| `src/features/customer/hooks/use-cart.ts` | In-memory cart state |
| `src/features/customer/utils/cart-total.ts` | Line totals + session estimate |

```ts
type CartItem = {
  localId: string;
  menuItemId: string;
  nameI18nKey: string;
  variantId?: string;
  variantNameI18nKey?: string;
  quantity: number;
  modifiers: Array<{ modifierId: string; nameI18nKey: string; priceDelta: number }>;
  notes?: string;
  unitPrice: number; // base + variant + modifiers per unit
};
```

Drawer adds to cart only — does not fire kitchen.

### Step 5 — Cart tab + place order

| File | Responsibility |
| --- | --- |
| `CartView.tsx` | Lines, edit/remove, totals, Place order button |
| `src/lib/validation/order.ts` | `placeOrderSchema` |
| `src/lib/orders/service.ts` | Business logic (see above) |
| `src/lib/orders/queries.ts` | Fetch orders for session |
| `src/app/api/sessions/[sessionId]/orders/route.ts` | POST handler |

After Place Order success: clear cart, switch to Orders tab, toast (simple inline message OK for MVP).

Block Place Order when `!isOpen` but still show menu/cart read-only.

### Step 6 — Orders tab

| File | Responsibility |
| --- | --- |
| `OrderStatusList.tsx` | Group by order number, status chips |
| `src/features/customer/hooks/use-orders.ts` | Fetch + poll session orders (every 5–10s until Phase 3 WS) |
| `src/features/customer/utils/order-grouping.ts` | Group items by order |

Status labels via `StatusChip` + i18n: Pending, Being prepared, Served, Cancelled.

### Step 7 — Pay tab (disabled state only)

| File | Responsibility |
| --- | --- |
| `PayScreen.tsx` | Bill summary; disabled until all items `SERVED` |

Disabled copy:

```text
Payment becomes available after all items are served.
```

Do **not** implement mock Telebirr in Phase 2 — that is cashier/payment phase. Show totals from `Payment` record when orders exist.

### Step 8 — Blocked / waiter screens + assistance

| File | Responsibility |
| --- | --- |
| `BlockedDeviceScreen.tsx` | Copy below + assistance CTA |
| `WaiterSessionMessage.tsx` | Copy below + assistance CTA |
| `src/app/api/sessions/[sessionId]/assistance/route.ts` | POST handler |

Blocked-device copy:

```text
This table already has an active order on another device.
Continue on the device you used first, or request waiter assistance.
```

Waiter-started copy:

```text
A waiter opened this order for your table.
Please call the waiter who opened your order.
```

### Step 9 — i18n

Add all new UI strings to `messages/en.json` and `messages/am.json`. Never hardcode display text in components.

---

## Required screens (target UI)

### 1. Customer Shell

- Header: brand mark, restaurant name, table label, `LanguageToggle`
- Tabs: Menu · Cart · Orders · Pay
- Navy pill = active tab; orange = active category

### 2. Menu Tab

- Horizontal category tabs
- Item cards with add button (orange square, right side)
- Tap card → `ItemDrawer`

### 3. Item Drawer

- Variants (radio), modifiers (checkbox), notes textarea
- Quantity stepper
- Sticky bottom: `Add to cart — ETB X`

### 4. Cart Tab

- Line items with variant/modifiers/notes
- Edit → reopen drawer; remove line
- Subtotal, service, VAT, estimated total
- `Place order` (primary orange)

### 5. Orders Tab

- Server order history for active session
- Group by order number + timestamp
- Per-item `kitchenStatus` chip

### 6. Pay Tab (Phase 2 scope)

- Disabled until every order item is `SERVED`
- Show bill summary when data exists
- No payment buttons yet

---

## Client state rules

- Cart lives in React state / `use-cart` — **not** in the database until Place Order.
- `deviceToken` lives in `localStorage` only — never send to Client Components from server props.
- After bootstrap, keep `sessionId` in shell state (from bootstrap response).
- On `deviceToken` mismatch from API → re-run bootstrap → show blocked screen.

---

## WebSocket (Phase 3 — not blocking Phase 2)

Event names in `src/lib/realtime/events.ts`:

| Event | When |
| --- | --- |
| `order.placed` | After place order (emit in Phase 2) |
| `order_item.status_changed` | Kitchen status PATCH (Phase 4) |
| `assistance.created` | Assistance POST |

Phase 2: Orders tab may **poll** `GET /api/sessions/[sessionId]/orders`. Phase 3 adds `lib/realtime/use-realtime.ts` to refetch on events.

---

## Error states

| Condition | Behavior |
| --- | --- |
| Restaurant closed | Block Place Order; show menu |
| Item unavailable | Disable in cart; message on place |
| Device token mismatch | `active_blocked_device` screen |
| Network failure | Keep cart; retry button |
| Active session exists (409 on POST /api/sessions) | Show blocked screen |

---

## Files to create / extend in Phase 2

```
src/
  app/api/sessions/[sessionId]/
    orders/route.ts              # POST — place order
    assistance/route.ts          # POST — waiter assistance

  components/shared/
    RestaurantHeader.tsx
    LanguageToggle.tsx
    StatusChip.tsx
    Money.tsx
    AppCard.tsx

  features/customer/
    components/
      CustomerShell.tsx
      MenuPage.tsx
      CategoryTabs.tsx
      MenuItemCard.tsx
      ItemDrawer.tsx
      CartView.tsx
      OrderStatusList.tsx
      PayScreen.tsx
      BlockedDeviceScreen.tsx
      WaiterSessionMessage.tsx
    hooks/
      use-cart.ts
      use-session-status.ts
      use-orders.ts
    utils/
      cart-total.ts
      order-grouping.ts

  lib/
    money/index.ts
    orders/queries.ts
    orders/service.ts
    validation/order.ts
```

Extend (do not duplicate):

- `CustomerBootstrapView.tsx` — gate only, delegate to shell
- `messages/en.json`, `messages/am.json`

---

## Acceptance checklist

### Already passing (Phase 1)

- [x] Bootstrap returns restaurant, table, menu, `sessionState`
- [x] `POST /api/sessions` creates session + returns `deviceToken`
- [x] Token saved to `localStorage` via `useDeviceToken`
- [x] `active_blocked_device` when token missing/wrong
- [x] `waiter_started` for waiter-opened sessions
- [x] Closed restaurant shows closed message

### Complete in Phase 2

- [ ] Customer shell with Menu / Cart / Orders / Pay tabs
- [ ] `LanguageToggle` on customer surface
- [ ] Item drawer with variants, modifiers, notes, quantity
- [ ] Cart add/edit/remove with ETB totals
- [ ] `POST /api/sessions/[sessionId]/orders` creates order + payment row
- [ ] Place Order clears cart and shows Orders tab with `PENDING` item
- [ ] Orders tab lists session orders (poll OK)
- [ ] Pay tab disabled until all items `SERVED`
- [ ] Blocked/waiter screens with assistance button
- [ ] `POST /api/sessions/[sessionId]/assistance` creates request
- [ ] `order.placed` published after place order
- [ ] All new strings in i18n files

### Manual test script

```text
1. Open /r/bole-cafe/t/2 (fresh table) → Start ordering → session active
2. Confirm localStorage has restaurant:bole-cafe:table:2:deviceToken
3. Menu tab → tap Doro Wat → add Extra injera + notes → Add to cart
4. Cart tab → verify line + totals → Place order
5. Cart empty; Orders tab shows Order #1, item Pending
6. Prisma Studio / kitchen page (manual refresh) shows order on Table 2
7. Pay tab disabled with message
8. Open same URL in incognito → active_blocked_device
9. Assistance button creates WaiterAssistanceRequest row
```

### Out of scope for Phase 2 (later phases)

- WebSocket client subscribe + live order updates (Phase 3)
- Kitchen KDS UI (Phase 4)
- Mock Telebirr + payment finalize (cashier phase)
- Full receipt view after payment

---

## Next phase

Once this checklist passes, proceed to **`docs/07-realtime-communication-contracts.md`** (Phase 3) — `use-realtime.ts`, kitchen auto-refresh on `order.placed`, customer Orders tab refetch on `order_item.status_changed`.
