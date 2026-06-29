# Phase 7: Owner Admin and Restaurant Operations

> **Build order:** In `docs/09-build-order-and-checklists.md`, admin is **Phase 7**, after Cashier (`docs/05-cashier-payment-phase.md`). All staff surfaces (customer, kitchen, waiter, cashier) and audit logging from mutations are already in place.

## Goal

Build `/r/[slug]/admin` — the owner-facing operations panel. Owners manage menu, inventory/recipes, tables/QR, staff, settings, and audit history. Changes propagate to customer menu, cashier bills, and staff dashboards.

## Prerequisites (Phases 0–6 — done / partial)

Do not rebuild unless fixing a bug.

| Item | Location | Status |
| --- | --- | --- |
| Admin route shells | `src/app/r/[slug]/admin/**` | Done — placeholder titles only (dashboard + 6 sub-pages) |
| Admin loading shell | `admin/loading.tsx` | Done |
| Staff login + OWNER-only guard | `middleware.ts`, `access_admin` | Done — only `OWNER` role; `owner@bole.test` / `password` |
| Other roles blocked from `/admin` | `permissions.ts` | Done — WAITER/KITCHEN/CASHIER redirect to staff login |
| OWNER on all staff routes | `permissions.ts` | Done — owner can also open waiter/kitchen/cashier |
| `Restaurant` settings fields | `prisma/schema.prisma` | Done — name, colors, taxPct, servicePct, openingHours, manualOpen, timezone |
| `computeIsOpen` | `lib/restaurants/service.ts` | Done — hours + manual override; used by place order + bootstrap |
| Menu bootstrap query | `getMenuForBootstrap` | Done — filters `manualAvailable && derivedAvailable` |
| Seeded menu (5 items, 5 categories) | `prisma/seed.ts` | Done — Doro Wat, Shiro, Kitfo, Margherita (+ variants), Macchiato |
| Seeded 12 tables + `qrToken` | `prisma/seed.ts` | Done |
| Seeded 4 staff accounts | `prisma/seed.ts` | Done |
| `Ingredient`, `Recipe` models | `prisma/schema.prisma` | Done — **not seeded** |
| `AuditLog` model + writes | Various services | Done — see audit table below |
| Owner table assignment | `POST /api/staff/assignments` | Done — body `{ tableId, staffId }` when caller is OWNER |
| Waiter self-assign | Same endpoint | Done — omit `staffId` |
| i18n admin nav keys | `messages/en.json` | Done — `admin.title`, `admin.menu`, etc. (minimal) |
| Shared UI | `AppCard`, `LanguageToggle`, `RoleBadge`, `Money` | Done — reuse |

### Audit actions already written (viewable once admin audit UI exists)

| Action | Source |
| --- | --- |
| `ORDER_ITEM_STATUS_CHANGED` | Kitchen KDS |
| `WAITER_SELF_ASSIGNED_TABLE` / `OWNER_ASSIGNED_TABLE` | Waiter assignments |
| `WAITER_OPENED_SESSION` | Waiter-started session |
| `WAITER_PLACED_ORDER` | Waiter place order |
| `WAITER_CANCELLED_ORDER_ITEM` | Waiter cancel |
| `WAITER_REORDERED_ITEM` | Waiter reorder |
| `ASSISTANCE_ACKNOWLEDGED` / `ASSISTANCE_RESOLVED` | Waiter assistance |
| `CASHIER_RECORDED_CASH` | Cashier |
| `CASHIER_FINALIZED_PAYMENT` | Cashier finalize |
| `CASHIER_VERIFIED_TELEBIRR` / `CASHIER_REJECTED_TELEBIRR` | Cashier Telebirr verify |
| `CUSTOMER_TELEBIRR_MOCK` | Customer Pay tab |

Kitchen activity sidebar reuses audit logs via `GET /api/restaurants/[slug]/kitchen/activity` — admin audit log should query the same `AuditLog` table with richer filters.

### Not built yet (this phase)

| Item | Notes |
| --- | --- |
| Admin layout + sidebar | `features/admin/*` |
| Dashboard metrics | Real DB queries |
| Menu CRUD APIs + UI | `/api/menu/*` |
| Inventory/recipe APIs + derived availability | `/api/inventory/*`, `lib/inventory/` |
| Table CRUD + QR generator | `/api/tables/*`, `QrGenerator.tsx` |
| Staff CRUD | `/api/staff/*` |
| Bulk shift assignments UI | Extend assignments or new bulk route |
| Settings PATCH | Restaurant update API |
| Admin audit log API + UI | Filterable list |
| `menu.availability_changed` WS event | Add to `events.ts` when inventory lands |
| Seed ingredients/recipes | Optional — add to `seed.ts` for demo |

### Demo credentials

| Email | Role | Password |
| --- | --- | --- |
| `owner@bole.test` | OWNER | `password` |

---

## Actor

Owner/Admin:

- Email/password staff login.
- Role: **`OWNER` only** on `/admin` routes (middleware `access_admin`).
- Desktop-first layout with sidebar navigation.

---

## Routes

```text
/r/[slug]/admin              Dashboard (replace placeholder)
/r/[slug]/admin/menu         Menu manager
/r/[slug]/admin/inventory    Inventory and recipes
/r/[slug]/admin/tables       Tables and QR
/r/[slug]/admin/staff        Staff manager
/r/[slug]/admin/settings     Restaurant settings
/r/[slug]/admin/audit-log    Audit log viewer
```

All protected — non-OWNER staff redirect to `/r/[slug]/staff`.

Replace individual placeholder pages with a shared **`AdminLayout`** (sidebar + header) wrapping section content.

---

## Navigation

Sidebar sections (i18n keys exist):

| Section | Route | i18n key |
| --- | --- | --- |
| Dashboard | `/admin` | `admin.title` |
| Menu | `/admin/menu` | `admin.menu` |
| Inventory | `/admin/inventory` | `admin.inventory` |
| Tables & QR | `/admin/tables` | `admin.tables` |
| Staff | `/admin/staff` | `admin.staff` |
| Settings | `/admin/settings` | `admin.settings` |
| Audit Log | `/admin/audit-log` | `admin.audit_log` |

Header: restaurant name, staff identity (`GET /api/auth/staff/me`), `LanguageToggle`, `RoleBadge`.

---

## Dashboard

Operational snapshot from real queries (no mock data):

| Metric | Source |
| --- | --- |
| Open sessions | `Session.status = ACTIVE` |
| Active tables | Tables with active session |
| Orders today | `Order.createdAt` since start of day (restaurant timezone) |
| Revenue today | Sum `PaymentTransaction.amount` where `status = SUCCESS` today |
| Items awaiting kitchen | `OrderItem.kitchenStatus IN (PENDING, BEING_PREPARED)` |
| Low stock alerts | `Ingredient.stock <= lowStockThreshold` |

Suggested API:

```text
GET /api/restaurants/[slug]/admin/dashboard
```

**Auth:** `requireStaff({ restaurantSlug: slug, action: "access_admin" })`.

---

## Menu manager

Owner manages categories, items, variants, modifiers, and manual availability.

### Data model (existing)

| Entity | Key fields |
| --- | --- |
| `MenuCategory` | `sortOrder`, `i18nKey`, `restaurantId` |
| `MenuItem` | `nameI18nKey`, `descriptionI18nKey`, `basePrice`, `imageUrl`, `manualAvailable`, `derivedAvailable` |
| `MenuItemVariant` | `nameI18nKey`, `priceDelta` |
| `MenuModifier` | `nameI18nKey`, `priceDelta`, `isRequired` |

Customer/waiter menus use **`getMenuForBootstrap`** — only items where `manualAvailable && derivedAvailable`.

i18n keys must exist in `messages/en.json` and `messages/am.json` (or add keys when creating items).

### Canonical API contracts

> Match `CURSOR-SCAFFOLD-PROMPT.md`. Do **not** use `/api/restaurants/[slug]/admin/menu`.

```text
GET  /api/menu                    # List categories + items (owner scope via session)
POST /api/menu                    # Create category
POST /api/menu/items              # Create item (+ nested variants/modifiers in body)
PATCH /api/menu/items/[itemId]    # Update item, toggle manualAvailable
DELETE /api/menu/items/[itemId]   # Soft-delete or hard-delete (MVP: set manualAvailable false)
```

**Auth:** `requireStaff({ action: "access_admin" })` + verify `restaurantId` from session.

**Downstream:** Customer bootstrap and waiter menu refetch on next load; optional `menu.availability_changed` WS event.

> Variants/modifiers: include in item POST/PATCH body or add sub-routes in a follow-up if needed for MVP.

---

## Inventory and recipes

Models exist; **seed has no ingredients yet**. Add demo ingredients in seed or via admin UI.

### Fields

| Entity | Fields |
| --- | --- |
| `Ingredient` | name, stock, unit, lowStockThreshold |
| `Recipe` | menuItemId, ingredientId, quantityNeeded |

### Availability rule

```text
MenuItem.available = manualAvailable AND all recipe ingredients have stock >= quantityNeeded
```

Implement **`derivedAvailable`** computation in `lib/inventory/service.ts`:

- `recomputeMenuAvailability(restaurantId)` — update `MenuItem.derivedAvailable` for all items with recipes
- Call after ingredient PATCH and on admin read (MVP: compute at read time in `getMenuForBootstrap` if not persisted)

When an item becomes unavailable:

- Emit **`menu.availability_changed`** (add to `events.ts`)
- Customer menu disables item on next bootstrap/refetch

### Canonical API contracts

```text
GET   /api/inventory
POST  /api/inventory
PATCH /api/inventory/[ingredientId]
```

Recipe linking: extend POST/PATCH body on menu items or add:

```text
POST /api/inventory/recipes        # optional — link ingredient to menu item
```

---

## Tables and QR

### Existing

- 12 tables seeded with `number`, `label`, `capacity`, `qrToken`, `isActive`
- Customer URL pattern: `/r/{slug}/t/{tableNumber}` (table number in path, not qrToken)

### Owner actions

- Create table (next number or explicit)
- Edit label, capacity
- Disable table (`isActive = false`)
- Show QR encoding customer URL

### QR content

```text
{origin}/r/{slug}/t/{tableNumber}
```

Use `window.location.origin` in browser or env `NEXT_PUBLIC_APP_URL` for server-side QR generation.

UI (`QrGenerator.tsx` per scaffold):

- Slug auto-filled from route
- Owner enters/edits label + capacity (number assigned or chosen)
- QR preview (client lib e.g. `qrcode` npm package)
- Download PNG + copy URL

### Canonical API contracts

```text
GET   /api/tables
POST  /api/tables
PATCH /api/tables/[tableId]
```

**Auth:** `access_admin`.

> Do not expose `qrToken` to customer bootstrap unless switching to token-based URLs later.

---

## Staff manager

### Existing accounts (seed)

| Email | Role |
| --- | --- |
| `owner@bole.test` | OWNER |
| `waiter@bole.test` | WAITER |
| `kitchen@bole.test` | KITCHEN |
| `cashier@bole.test` | CASHIER |

### Owner actions

- Create staff (name, email, role, password)
- Activate/deactivate (`isActive`)
- Reset password
- Assign waiters to tables for a shift

### Canonical API contracts

```text
GET    /api/staff
POST   /api/staff
PATCH  /api/staff/[staffId]
DELETE /api/staff/[staffId]       # MVP: deactivate only (isActive false)
```

Password hashing: reuse `hashPassword` from `lib/auth/password.ts`.

### Table assignments (partial — reuse)

**Already implemented:**

```text
POST /api/staff/assignments
```

Body for owner assigning a waiter to one table:

```json
{
  "tableId": "table_id",
  "staffId": "waiter_staff_id"
}
```

Audit: `OWNER_ASSIGNED_TABLE`. Emits `table.assignment_changed`.

**Admin UI needs:** shift date picker + multi-select tables + bulk save.

Options for bulk assign (pick one in implementation):

1. **Recommended:** New `POST /api/staff/assignments/bulk` with `{ staffId, shiftDate, tableIds[] }` — replaces assignments for that waiter/date
2. Loop existing `POST /api/staff/assignments` from UI (simplest MVP)

> Do **not** use `POST /api/restaurants/[slug]/staff/[staffId]/table-assignments` — not in scaffold.

Uses `getShiftDate()` from `lib/waiter/shift.ts` (UTC date) unless admin passes explicit `shiftDate`.

---

## Settings

Owner configures restaurant record fields:

| Field | Effect |
| --- | --- |
| `name`, `logoUrl` | Header/branding |
| `primaryColor`, `secondaryColor` | CSS vars via `RestaurantProvider` |
| `taxPct`, `servicePct` | `computeTotals` → cashier/customer bills |
| `openingHours` (JSON) | `computeIsOpen` |
| `manualOpen` | Force open (`true`) or closed (`false`); `null` = auto from hours |
| `timezone` | Hours evaluation (`Africa/Addis_Ababa` default) |

Telebirr merchant config: placeholder field in UI only (no real integration).

### Canonical API

```text
GET  /api/restaurants/[slug]/admin/settings   # or GET from restaurant by slug
PATCH /api/restaurants/[slug]/admin/settings
```

Alternative: `PATCH /api/restaurants/[slug]` if you add a thin restaurant update route.

**Open/closed behavior (already wired):**

- `computeIsOpen(restaurant)` in bootstrap + `placeOrder`
- Closed restaurant: customer sees closed message on new sessions; active sessions continue
- Changing tax/service: next `recalculateSessionPayment` updates bills

Audit: `OWNER_UPDATED_SETTINGS` with before/after in `payloadJson`.

---

## Audit log

Owner views filterable history from `AuditLog` table.

### Filters (UI)

- Date range
- Actor staff
- Entity type
- Action string
- Table number (from `payloadJson`)

### Canonical API

```text
GET /api/restaurants/[slug]/admin/audit-log?from=&to=&action=&staffId=&limit=
```

Reuse query patterns from `lib/kitchen/queries.ts` → `getKitchenAuditLogs` but with filters and pagination.

Display: timestamp, actor name, action, entity, payload summary (table, item name i18n key, amounts).

---

## WebSocket events

### Add in this phase

| Event | When |
| --- | --- |
| `menu.availability_changed` | Ingredient stock / recipe / manualAvailable changes |

### Optional

| Event | When |
| --- | --- |
| `settings.updated` | Tax/service/hours change — staff dashboards refetch |

Customer menu can poll bootstrap until WS wired on customer shell.

---

## Audit requirements (admin mutations)

Every admin mutation writes `AuditLog`:

| Action | When |
| --- | --- |
| `OWNER_CREATED_MENU_ITEM` | Menu create |
| `OWNER_UPDATED_MENU_ITEM` | Menu update |
| `OWNER_UPDATED_INGREDIENT` | Stock change |
| `OWNER_CREATED_TABLE` | Table create |
| `OWNER_UPDATED_TABLE` | Table update |
| `OWNER_CREATED_STAFF` | Staff create |
| `OWNER_UPDATED_STAFF` | Staff update/deactivate |
| `OWNER_UPDATED_SETTINGS` | Settings save |
| `OWNER_BULK_ASSIGNED_TABLES` | Bulk shift assignment |

Include before/after in `payloadJson` when values change.

---

## Phase 7 implementation steps

### Step 1 — Admin lib + auth helper

- `requireOwner()` or always `requireStaff({ action: "access_admin" })` + assert `role === OWNER` on mutating routes
- `lib/admin/queries.ts` — dashboard metrics, audit log filters
- `lib/admin/service.ts` — dashboard DTO
- `lib/inventory/service.ts` — stock + `recomputeMenuAvailability`
- `lib/validation/menu.ts`, `inventory.ts`, `admin.ts` — Zod schemas

### Step 2 — API routes

```
src/app/api/
  restaurants/[slug]/admin/
    dashboard/route.ts       # GET
    settings/route.ts        # GET, PATCH
    audit-log/route.ts       # GET
  menu/
    route.ts                 # GET, POST category
    items/route.ts           # POST item
    items/[itemId]/route.ts  # PATCH, DELETE
  inventory/
    route.ts                 # GET, POST
    [ingredientId]/route.ts  # PATCH
  tables/
    route.ts                 # GET, POST
    [tableId]/route.ts       # PATCH
  staff/
    route.ts                 # GET, POST
    [staffId]/route.ts       # PATCH, DELETE
  staff/assignments/bulk/route.ts  # POST optional
```

Extend `lib/restaurants/queries.ts` for settings update.

Add `menu.availability_changed` to `events.ts`.

### Step 3 — Admin components

| File | Responsibility |
| --- | --- |
| `AdminLayout.tsx` | Sidebar + header shell |
| `AdminSidebar.tsx` | Nav links |
| `DashboardSummary.tsx` | Metric cards |
| `MenuManager.tsx` | Categories + items CRUD |
| `InventoryManager.tsx` | Ingredients + low stock |
| `TableManager.tsx` | Table list + create/edit |
| `QrGenerator.tsx` | QR preview/download |
| `StaffManager.tsx` | Staff list + create/edit |
| `ShiftAssignmentForm.tsx` | Bulk waiter assignments |
| `SettingsForm.tsx` | Restaurant settings |
| `AuditLogTable.tsx` | Filterable audit list |

Hook: `use-admin-data.ts` — fetch helpers per section.

### Step 4 — Wire admin pages

Replace placeholders under `src/app/r/[slug]/admin/**` with layout + section components.

### Step 5 — Seed + i18n

- Add sample `Ingredient` + `Recipe` rows to `prisma/seed.ts` (e.g. Doro Wat → berbere, chicken)
- Expand `admin.*` strings in `messages/en.json` / `am.json`

---

## Files to create

```
src/
  app/api/
    restaurants/[slug]/admin/dashboard/route.ts
    restaurants/[slug]/admin/settings/route.ts
    restaurants/[slug]/admin/audit-log/route.ts
    menu/route.ts
    menu/items/route.ts
    menu/items/[itemId]/route.ts
    inventory/route.ts
    inventory/[ingredientId]/route.ts
    tables/route.ts
    tables/[tableId]/route.ts
    staff/route.ts
    staff/[staffId]/route.ts
    staff/assignments/bulk/route.ts   # optional

  features/admin/
    components/  (see Step 3)
    hooks/
      use-admin-data.ts

  lib/admin/
    queries.ts
    service.ts
  lib/inventory/
    service.ts
    queries.ts
  lib/validation/
    menu.ts
    inventory.ts
```

Extend:

- `lib/restaurants/queries.ts` — settings update
- `lib/restaurants/bootstrap.ts` — optional live derived availability
- `lib/realtime/events.ts`
- `prisma/seed.ts` — ingredients/recipes

---

## Acceptance checklist

### Already passing

- [x] Owner login reaches `/r/bole-cafe/admin`
- [x] Non-owner roles blocked from `/admin`
- [x] Menu items served to customer via bootstrap
- [x] `computeIsOpen` + manual override model exists
- [x] Tax/service percentages on restaurant affect payment totals
- [x] Owner can assign waiter via `POST /api/staff/assignments` (API; no admin UI yet)
- [x] Staff mutations across waiter/kitchen/cashier write audit logs

### Complete in Admin phase

- [ ] Admin sidebar navigates all 7 sections
- [ ] Dashboard shows live session/order/revenue metrics
- [ ] Owner creates/edits menu item → customer menu updates
- [ ] Owner adds modifier to Doro Wat → appears in customer `ItemDrawer`
- [ ] Owner reduces ingredient stock → item `derivedAvailable false` → customer cannot order
- [ ] Owner creates table + generates QR → URL opens customer bootstrap
- [ ] Owner creates waiter account → can login
- [ ] Owner bulk-assigns waiter to tables for today → waiter dashboard shows assignments
- [ ] Owner changes service charge → cashier bill reflects new total
- [ ] Owner forces closed → new customer sessions blocked
- [ ] Audit log shows waiter/kitchen/cashier actions with filters

### Manual test script

```text
1. Login as owner@bole.test → /r/bole-cafe/admin
2. Dashboard shows ≥1 open session if any table active
3. Menu → add modifier to Doro Wat → customer ItemDrawer shows it
4. Inventory → create ingredient, link recipe, set stock to 0 → Doro Wat unavailable on customer menu
5. Tables → create Table 13 → generate QR → scan opens /r/bole-cafe/t/13
6. Staff → create waiter2@bole.test → login works
7. Staff → assign waiter to Tables 1–3 for today → waiter sees assignments
8. Settings → set servicePct to 10 → cashier bill service line changes on next order
9. Settings → manualOpen false → customer cannot start new session
10. Audit log → filter by CASHIER_FINALIZED_PAYMENT after a paid session
```

---

## Out of scope (later)

- Multi-restaurant owner account
- Real Telebirr merchant configuration
- Background jobs for availability (MVP: compute on read/write)
- Menu image upload (URL field only)
- Role permissions editor beyond fixed enum

---

## Next phase

Proceed to **`docs/09-build-order-and-checklists.md` Phase 8** — i18n polish, empty/loading states, and end-to-end QA across all surfaces.

Reference: **`docs/07-realtime-communication-contracts.md`** for `menu.availability_changed` payload shape.
