# Restaurant Order & Payment System — Lovable Design Spec

> **Purpose:** Paste-ready specification for Lovable UI generation.  
> **Stack note:** Lovable produces the **UI prototype only**. Production will be **Next.js App Router** (frontend + API routes + WebSockets) — match layouts, flows, and component structure; backend wiring comes later.  
> **Product type:** Multi-tenant SaaS — one deployment, many restaurants.

---

## Product summary

A mobile-first PWA for Ethiopian restaurants. Customers scan a table QR to browse the menu and order. Kitchen staff fulfill orders on a KDS. Waiters assist non–tech-savvy guests and manage assigned tables. Cashiers finalize any payment that involves cash. Restaurant owners configure menus, tables, staff, hours, and branding.

**Currency:** ETB only  
**Languages:** English + Amharic (i18n via JSON locale files keyed by `i18n_key`)  
**Realtime:** WebSocket subscriptions on all role dashboards (prototype: simulate with polling or mock live updates)

---

## URL structure

All routes are scoped by restaurant slug.

| Role | Route |
|------|-------|
| Customer (QR entry) | `order.app.com/r/{slug}/t/{table}` |
| Waiter | `order.app.com/r/{slug}/waiter` |
| Kitchen (KDS) | `order.app.com/r/{slug}/kitchen` |
| Cashier | `order.app.com/r/{slug}/cashier` |
| Owner / Admin | `order.app.com/r/{slug}/admin` |

**QR code content:** Full URL — `https://order.app.com/r/{slug}/t/{table}`

**Public bootstrap endpoint (no auth):**  
On load, `{slug}` pages call a public API that returns restaurant branding, table info, menu, and open/closed status.

```json
{
  "restaurant": {
    "id": "uuid",
    "name": "Bole Café",
    "slug": "bole-cafe",
    "logo_url": "...",
    "primary_color": "#E85D04",
    "secondary_color": "#1A1A2E"
  },
  "table": { "id": "12", "label": "Table 12", "number": 12 },
  "menu": [...],
  "is_open": true,
  "hours_message": "Open until 10:00 PM"
}
```

---

## Actors & authentication

| Actor | Auth | Device / UI |
|-------|------|-------------|
| **Customer** | None — session via QR + `device_token` in `localStorage` | Mobile web from QR scan |
| **Waiter** | Email + password (unique per staff) | Tablet-optimized dashboard |
| **Kitchen** | **One shared login per restaurant** (activity log built in) | Tablet KDS, large touch targets |
| **Cashier** | Email + password (role = cashier) | Desktop / tablet |
| **Owner / Admin** | Email + password (role = owner) | Desktop admin panel |

### Landing / entry screen (customer-facing root per restaurant)

- **Primary CTA:** Scan QR (most prominent)
- **Secondary:** Staff login link → routes to role selection or unified staff login, then redirect by role
- Bilingual toggle (EN / AM) in header

---

## Role capabilities matrix

| Action | Customer | Waiter | Kitchen | Cashier | Owner |
|--------|:--------:|:------:|:-------:|:-------:|:-----:|
| Scan QR / start session | ✓ | — | — | — | — |
| Blocked 2nd device scan | shown | — | — | — | — |
| Request waiter assistance | ✓ | receives | — | — | — |
| Browse menu / add to cart | ✓ | ✓ assigned/self-assigned | — | — | — |
| Place order to kitchen | ✓ | ✓ | — | — | — |
| Edit / cancel items (rules below) | ✓ | ✓ assigned | — | — | — |
| View all tables | — | ✓ read | ✓ | ✓ | ✓ |
| Self-assign table | — | ✓ | — | — | — |
| Open session on behalf of table | — | ✓ (no device lock) | — | — | — |
| Update item kitchen status | — | — | ✓ | — | — |
| Initiate Telebirr (mock v1) | ✓ | ✓ assist mode | — | — | — |
| Record cash / partial payment | — | — | — | ✓ | — |
| Close session | auto (full Telebirr) | — | ✓ (cash/manual) | ✓ (cash/manual) | — |
| Manage menu / tables / QR / staff | — | — | — | — | ✓ |
| Configure tax, service charge, hours | — | — | — | — | ✓ |
| View audit / activity logs | — | partial | kitchen log | — | ✓ |

---

## Session rules (critical UX)

### One session per table

- A table may have **at most one active session**.
- **One live cart** per active session.
- Each **Place order** action creates a **new Order** under that session.
- Kitchen and cashier views show **all orders cumulatively** for the table until payment completes and session closes.

### Device binding (customer-started sessions)

1. First scan creates session + generates random `device_token` → stored in browser `localStorage`.
2. Subsequent scans on the **same device** rejoin the active session.
3. **Different device** while session is active:
   - Show blocking screen: *"Continue on the device you used to start, or contact a waiter."*
   - Offer **Request waiter assistance** button → creates a notification on waiter dashboard.
4. When session closes → clear `device_token` from `localStorage` → new device may start fresh session.

### Waiter-started sessions

- Valid: waiter opens session and submits first order **without** device binding.
- If customer scans afterward:
  - Show: *"Please call the waiter who opened your order."*
  - Same **Request waiter assistance** option.

### Session closure

- **Cashier only** may force-close in MVP edge cases (automation for walk-outs is out of scope).
- Normal closure paths:
  - **100% Telebirr (mock/real):** auto `PAID` + session `closed` — no cashier step.
  - **Any cash involvement (full or partial):** cashier manually finalizes → session `closed`.

---

## Order & kitchen rules

### Order structure

- **Session** → many **Orders** (one per "Place order" tap).
- Each **Order** has `order_number`, `taken_by_staff_id` (nullable), `created_at`.
- **Order.status** is **derived from its OrderItems** (do not manually set at order level).

### OrderItem kitchen status

```
pending → being_prepared → served
```

| Status | Who advances | Cancel / edit |
|--------|--------------|---------------|
| `pending` | Kitchen → `being_prepared` | Customer & waiter may edit/cancel |
| `being_prepared` | Kitchen → `served` | Cancel only with valid reason (waiter; audit logged) |
| `served` | — | Cancel only with valid reason (waiter; audit logged) |

**Reorder / comp (customer disappointed):** Add **new OrderItem** on same session (waiter action, audit logged).

### Kitchen display (KDS)

- Group orders **by table** (only tables with active sessions).
- Within each table: **separate cards per Order** showing `order_number` and timestamp.
- **Time filter** on cards (e.g. last 30 min / 1 hr / all) for clarity during rush.
- Item rows show: name, variant, qty, notes, modifiers, current `kitchen_status`.
- Tap actions: advance item status; optional sound/badge on new orders (WebSocket).

---

## Payment rules

### Scope

- Bill is **session-level** — all orders on the table combined.
- **MVP: payment is blocked until all OrderItems are `served`.** Disable pay button / show message until kitchen completes.

### Payment status

```
unpaid → partially_paid → paid
```

| Scenario | Flow | Session close |
|----------|------|---------------|
| 100% Telebirr | Customer (or waiter assist) initiates → mock/webhook success → auto `paid` | Auto |
| 100% cash | Cashier records payment | Cashier action → `paid` + close |
| Mixed (e.g. 70% cash + 30% Telebirr) | Cashier manually records each leg | Cashier finalizes when fully paid |

**Rule:** Auto transition to `paid` **only** when initiated and completed **wholly via Telebirr**. Any cash involvement → cashier manually finalizes.

### Telebirr (Phase 1 = mock)

- Customer initiates from their device when bill is ready.
- **Waiter assist flow:** Waiter takes customer's phone → enters amount on payment screen → hands phone back for PIN entry.
- `bill_ref_number`: generated by **Telebirr aggregator + backend-unique system ID**.
- **Webhook failure UX (both surfaces):**
  - **Customer:** Retry prompt + "Check if payment went through"
  - **Cashier:** "Pending verification" queue — reconcile against merchant account / kitchen DB for matching `bill_ref_number` + amount

### Receipts

- **One receipt per PaymentTransaction** (not per session).
- In-app receipt view after each transaction.
- Customer may **request printed receipt** (UI button; print integration Phase 2).

### Not in MVP

- Discounts
- Payment before all items served
- Walk-out / unpaid session automation

---

## Pricing configuration

Owner configures per restaurant (admin settings):

| Setting | Notes |
|---------|-------|
| `service_charge_pct` | Applied to session subtotal |
| `tax_pct` (VAT) | Configurable, separate line item |
| `currency` | Always ETB (display only) |
| `opening_hours` | JSON schedule; auto `is_open` |
| `is_open` manual override | Owner can force open/closed |

**Outside service hours:** Block **new orders** only. Active sessions continue; no new "Place order".

---

## Menu & cart UX

### Menu layout

- **Horizontal scroll category tabs** at top (sticky on mobile).
- Menu cards: image (optional), name, price, availability badge.
- **Variants** for sized items (e.g. pizza: Small / Medium / Large) — price delta per variant.
- **Structured modifiers** (e.g. Extra cheese +20 ETB) **plus** free-text notes field.
- Unavailable items: greyed out, not addable.

### Availability (Phase 1)

- **Auto from inventory/recipe:** When ingredient stock falls below threshold, linked menu items auto-set `available = false`.
- Owner can also manually toggle availability.

### Cart

- Single live cart per session.
- Show: items, variants, modifiers, notes, running subtotal.
- **Place order** → submits current cart as new Order → cart clears for next round.
- Edit/remove only while items are still `pending` in kitchen (or per cancel rules above).

---

## Waiter dashboard

### Table grid

- See **all tables** with status chips: `idle` | `active` | `awaiting_payment` | `assistance_requested`
- **Owner-assigned tables** at shift start + **self-assign** capability.
- Edit actions only on **assigned + self-assigned** tables (read-only on others).

### Notifications

- Assistance requests from blocked customer devices.
- Optional: new order placed on assigned table.

### Actions on assigned table

- Open session (skip device lock).
- Add/modify cart items, place orders.
- Cancel/edit per rules; add comp/reorder items.
- Telebirr assist mode.
- All mutations → **AuditLog** entry (staff_id, timestamp, action, payload).

---

## Cashier dashboard

- Table list with active sessions.
- Per table: all orders (cumulative), item list with served status, session totals (subtotal, service charge, tax, **total due**, **total paid**, **balance**).
- Payment method indicators: Telebirr / cash / partial.
- Actions:
  - Record cash payment (full or partial).
  - Mark mixed payment legs.
  - Finalize & close session (cash paths).
  - Telebirr verification queue (webhook failures).
- View/print receipt per transaction.

---

## Owner / Admin panel

Route: `/r/{slug}/admin` — slug auto-populated from URL; no slug picker needed.

### Sections

1. **Dashboard** — today's orders, open sessions, revenue summary (mock data in prototype).
2. **Menu** — categories, items, variants, modifiers, i18n keys, availability override.
3. **Inventory & recipes** — ingredients, stock, recipe links, low-stock alerts.
4. **Tables** — create/edit tables, capacity, generate/download QR (URL pre-filled with slug + table).
5. **Staff** — create accounts (email/password), assign role (waiter | kitchen | cashier | owner), assign tables for shift.
6. **Settings** — branding (logo, colors), service charge, tax, opening hours, manual open/closed toggle, Telebirr merchant config (placeholder in v1).
7. **Audit log** — filterable list of waiter/kitchen/cashier actions.

---

## Data model

```
Platform (SaaS — no super-admin UI in Phase 1)

Restaurant
  ├── id, slug, name, logo_url, primary_color, secondary_color
  ├── timezone, currency (ETB), is_active
  ├── config: service_charge_pct, tax_pct, opening_hours, telebirr_merchant_id
  ├── is_open (computed from hours + manual_override)

Table
  ├── id, restaurant_id, number, label, capacity, qr_token, is_active

Staff
  ├── id, restaurant_id, name, email, password_hash, role (owner|waiter|kitchen|cashier)
  ├── is_active

StaffTableAssignment
  ├── id, staff_id, table_id, assigned_by, shift_date, created_at

MenuCategory
  ├── id, restaurant_id, sort_order, i18n_key

MenuItem
  ├── id, category_id, name_i18n_key, description_i18n_key, base_price
  ├── available (manual OR derived from inventory), image_url

MenuItemVariant
  ├── id, menu_item_id, name_i18n_key, price_delta

MenuModifier
  ├── id, menu_item_id, name_i18n_key, price_delta, is_required

Ingredient
  ├── id, restaurant_id, name, stock, unit, low_stock_threshold

Recipe
  ├── menu_item_id, ingredient_id, quantity_needed

Session
  ├── id, table_id, status (idle|active|closed)
  ├── started_by_type (customer|waiter), started_by_staff_id?
  ├── device_token? (null if waiter-started)
  ├── started_at, ended_at, closed_by_staff_id?

Order
  ├── id, session_id, order_number, taken_by_staff_id?
  ├── created_at
  ├── status (derived: open|in_kitchen|served|cancelled)

OrderItem
  ├── id, order_id, menu_item_id, variant_id?, quantity, unit_price
  ├── modifiers_json, notes
  ├── kitchen_status (pending|being_prepared|served|cancelled)
  ├── cancelled_at?, cancelled_by_staff_id?, cancel_reason?

Payment
  ├── id, session_id, status (unpaid|partially_paid|paid)
  ├── subtotal, service_charge, tax, total_due, total_paid

PaymentTransaction
  ├── id, payment_id, amount, method (telebirr|cash)
  ├── status, telebirr_ref?, telebirr_status?
  ├── cash_tendered?, recorded_by_staff_id?, created_at

AuditLog
  ├── id, restaurant_id, entity_type, entity_id, action
  ├── actor_type (staff|customer|system), actor_staff_id?
  ├── payload_json, created_at

WaiterAssistanceRequest
  ├── id, session_id, table_id, device_info?, status (pending|acknowledged|resolved)
  ├── created_at, acknowledged_by_staff_id?
```

---

## State machines

### Session

```
(no session) → active → closed
```

- `active`: first QR scan (customer) OR waiter opens table.
- `closed`: full Telebirr success OR cashier finalizes cash/mixed payment.

### OrderItem (kitchen)

```
pending → being_prepared → served
         ↘ cancelled (with reason + audit)
```

### Payment

```
unpaid → partially_paid → paid
```

- `partially_paid`: at least one PaymentTransaction recorded, balance > 0.
- `paid`: total_paid >= total_due → triggers session close (cashier confirm for cash paths; auto for full Telebirr).

---

## WebSocket events (prototype: mock)

| Event | Subscribers | Payload hint |
|-------|-------------|--------------|
| `order.placed` | Kitchen, Waiter, Customer | table_id, order_id, items |
| `order_item.status_changed` | Kitchen, Waiter, Customer | item_id, new_status |
| `session.updated` | Waiter, Cashier, Customer | session status, totals |
| `payment.updated` | Cashier, Customer | payment status, balance |
| `payment.completed` | All | session closed |
| `assistance.requested` | Waiter | table_id, session_id |
| `menu.availability_changed` | Customer | menu_item_id, available |

---

## i18n

- JSON locale files: `en.json`, `am.json`.
- All UI strings and menu/category/modifier names use `i18n_key` lookups.
- Language toggle persists in `localStorage`.
- Amharic must not break layouts — allow text wrap, avoid fixed narrow buttons.

---

## Design direction for Lovable

| Surface | Layout priority |
|---------|-----------------|
| Customer menu/cart | Mobile-first, thumb-friendly, bottom cart bar |
| Waiter / Kitchen | Tablet landscape-friendly, large tap targets, high contrast |
| Cashier | Desktop/tablet, dense table list, clear money columns |
| Admin | Desktop sidebar nav, CRUD tables, forms |

**Branding:** Apply `primary_color` / `secondary_color` from bootstrap JSON as CSS variables.  
**Empty states:** Every list view needs an empty state (no orders, no open sessions, restaurant closed).  
**Offline/async:** Show optimistic UI with sync indicators; no hard offline mode in MVP.

---

## Phase plan

### Phase 1 — MVP (generate this in Lovable)

- [ ] Customer QR flow + device binding + assistance request
- [ ] Waiter-started session (no device lock) + blocked customer message
- [ ] Menu with categories, variants, modifiers, i18n toggle
- [ ] Cart + place order (multiple orders per session)
- [ ] Kitchen KDS with item statuses, order cards, time filter
- [ ] Waiter dashboard: all tables, assign/self-assign, edit assigned
- [ ] Cashier: session bill, cash recording, partial payments, manual close
- [ ] Mock Telebirr payment + retry UI + cashier verification queue
- [ ] Owner admin: menu, tables, QR gen, staff, inventory/recipes, settings, audit log
- [ ] Service hours: block new orders when closed
- [ ] WebSocket-ready UI (mock live updates)
- [ ] EN + AM localization structure

### Phase 2

- [ ] Real Telebirr integration + webhook reconciliation
- [ ] Printed receipt
- [ ] Enhanced audit/reporting

### Phase 3

- [ ] SaaS super-admin (onboard restaurants)
- [ ] Analytics dashboard
- [ ] Walk-out / unpaid session handling

---

## Screen inventory (build list for Lovable)

### Customer — `/r/{slug}/t/{table}`

1. Restaurant closed banner
2. Menu (category tabs, item list, item detail sheet with variants/modifiers)
3. Cart drawer / page
4. Order status tracker (items by kitchen status)
5. Blocked device screen + assistance request
6. Waiter-opened session message
7. Payment screen (disabled until all served) — mock Telebirr
8. Payment retry / verification pending
9. In-app receipt

### Waiter — `/r/{slug}/waiter`

1. Login
2. Table grid (all tables, status chips)
3. Table detail (session, cart, orders, actions)
4. Assistance request inbox
5. Self-assign / view assignments
6. Telebirr assist payment flow

### Kitchen — `/r/{slug}/kitchen`

1. Shared login
2. KDS main board (tables → order cards → items)
3. Time filter controls
4. Activity log sidebar (shared account)

### Cashier — `/r/{slug}/cashier`

1. Login
2. Active sessions list
3. Session payment detail (totals, transactions, balance)
4. Record cash / partial payment form
5. Telebirr verification queue
6. Receipt view

### Admin — `/r/{slug}/admin`

1. Login
2. Dashboard
3. Menu manager (categories, items, variants, modifiers)
4. Inventory & recipes
5. Tables + QR generator
6. Staff manager + table assignment
7. Settings (branding, tax, service charge, hours)
8. Audit log

### Shared

1. Staff login page
2. 404 / restaurant not found
3. Language switcher component

---

## Lovable paste prompt

Copy everything below into Lovable as the initial prompt.

---

```
Build a multi-tenant restaurant order & payment PWA UI prototype (no real backend — use mock data and simulated WebSocket updates). Production will be Next.js App Router later; match that component structure.

PRODUCT: Ethiopian restaurant SaaS. Currency ETB. Languages English + Amharic with i18n toggle (JSON locale keys). Mobile-first customer flow; tablet kitchen/waiter; desktop admin/cashier.

ROUTES (restaurant slug in path):
- Customer QR: /r/{slug}/t/{table}
- Waiter: /r/{slug}/waiter
- Kitchen KDS: /r/{slug}/kitchen
- Cashier: /r/{slug}/cashier
- Admin: /r/{slug}/admin

ACTORS:
1. Customer — no login, scans QR. One cart per table session. Place order creates new order under session. Payment only when ALL items served. Mock Telebirr pay button.
2. Waiter — email/password login. See ALL tables; edit only assigned + self-assigned. Can open session without device lock. Cancel/edit orders. Telebirr assist (enter amount on customer phone). Notifications for assistance requests.
3. Kitchen — one shared login per restaurant with activity log. KDS: orders grouped by table, separate cards per order_number with timestamps, time filter. Item statuses: pending → being_prepared → served.
4. Cashier — separate from waiter. Session-level billing. Record cash and partial payments. Manual finalize when any cash involved. Auto-close only on 100% Telebirr. Verification queue for failed webhooks.
5. Owner Admin — menu/categories/variants/modifiers, inventory+recipes (auto menu availability), tables+QR generator (URL: order.app.com/r/{slug}/t/{table}), staff accounts, tax+service charge+hours config, audit log.

SESSION RULES:
- One active session per table. device_token in localStorage for customer sessions. Different device → block screen + "Request waiter assistance". Session close clears token.
- Waiter-started session → customer scan shows "Call the waiter who opened your order."
- Kitchen/cashier see cumulative orders until session closes.

PAYMENT:
- Session total with service charge + configurable VAT.
- 100% Telebirr (mock) → auto paid + close session.
- Any cash (full or partial) → cashier manually finalizes.
- One receipt per transaction. No discounts in v1.

MENU UX:
- Horizontal scroll category tabs. Variants (pizza sizes). Structured modifiers + free text notes. Unavailable items greyed out.

DESIGN:
- Apply restaurant primary/secondary colors from mock bootstrap API.
- High contrast kitchen/waiter tablets. Bottom cart bar on mobile customer view.
- Empty states everywhere. Restaurant closed banner blocks new orders.

Build Phase 1 screens only. Use realistic Ethiopian restaurant mock data (Bole Café, Addis Ababa). Include EN and AM label examples.
```

---

## Open items (post-prototype)

These are documented but deferred — do not block Lovable generation:

- Real Telebirr API + webhook handler (Phase 2)
- Physical receipt printer integration (Phase 2)
- Super-admin SaaS console (Phase 3)
- Unpaid walk-out automation (Phase 3)
- Discounts (future release)

---

*Last updated: spec locked from stakeholder Q&A — ready for Lovable.*
