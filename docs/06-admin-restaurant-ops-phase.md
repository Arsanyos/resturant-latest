# Phase 6: Owner Admin and Restaurant Operations

## Goal

Build `/r/[slug]/admin`, the owner-facing operations panel. Owners manage the restaurant setup that powers customer, waiter, kitchen, and cashier flows.

## Actor

Owner/Admin:

- Email/password staff login.
- Role: `OWNER`.
- Desktop-first layout.

## Route

```text
/r/[slug]/admin
```

## Navigation

Sidebar sections:

1. Dashboard
2. Menu
3. Inventory and Recipes
4. Tables and QR
5. Staff
6. Settings
7. Audit Log

## Dashboard

Show high-level operational snapshot:

- Open sessions.
- Active tables.
- Orders placed today.
- Revenue today.
- Items awaiting kitchen.
- Low stock alerts.

Use mock/derived data in early implementation, but query real database records when available.

## Menu Manager

Owner can manage:

- Categories.
- Menu items.
- Variants.
- Modifiers.
- Manual availability override.
- i18n keys for names/descriptions.

Category fields:

- Sort order.
- `i18nKey`.

Menu item fields:

- Category.
- Name i18n key.
- Description i18n key.
- Base price.
- Image URL.
- Manual available toggle.

Variant examples:

- Pizza Small.
- Pizza Medium.
- Pizza Large.

Modifier examples:

- Extra injera, ETB 30.
- Extra egg, ETB 25.
- Extra cheese, ETB 20.

## Inventory and Recipes

Inventory is included in Phase 1 because menu availability depends on ingredient stock.

Ingredient fields:

- Name.
- Stock quantity.
- Unit.
- Low stock threshold.

Recipe fields:

- Menu item.
- Ingredient.
- Quantity needed.

Availability rule:

```text
MenuItem is available when manualAvailable is true and all recipe ingredients have enough stock.
```

When ingredient stock falls below a recipe requirement:

- Set or compute `derivedAvailable = false`.
- Emit `menu.availability_changed`.
- Customer menu disables affected item.

MVP can compute availability at read time instead of background jobs.

## Tables and QR

Owner can:

- Create table.
- Edit table number, label, capacity.
- Disable table.
- Generate QR code.

QR content:

```text
https://order.app.com/r/{slug}/t/{tableNumber}
```

UI requirements:

- Slug is auto-populated from URL.
- Owner only enters table number/label/capacity.
- Show QR preview.
- Download QR button.
- Copy URL button.

## Staff Manager

Owner can:

- Create staff account.
- Set role: waiter, kitchen, cashier, owner.
- Activate/deactivate account.
- Reset password.
- Assign waiters to tables for a shift.

Staff roles:

- `WAITER`
- `KITCHEN`
- `CASHIER`
- `OWNER`

Kitchen account:

- One shared kitchen account per restaurant is acceptable in MVP.
- Activity log still records actions against this account.

## Table Assignments

Owner assigns waiters at shift start.

UI:

- Select shift date.
- Select waiter.
- Multi-select tables.
- Save assignments.

Endpoint:

```text
POST /api/restaurants/[slug]/staff/[staffId]/table-assignments
```

Body:

```json
{
  "shiftDate": "2026-06-08",
  "tableIds": ["table_1", "table_2"]
}
```

## Settings

Owner configures:

- Restaurant name.
- Logo URL.
- Primary color.
- Secondary color.
- Tax/VAT percentage.
- Service charge percentage.
- Opening hours.
- Manual open/closed override.
- Telebirr merchant config placeholder.

Open/closed rule:

- Auto from opening hours.
- Manual override can force open or closed.
- Outside service hours, block new orders but allow active sessions to continue.

## Audit Log

Owner can view filterable audit log:

Filters:

- Date range.
- Actor.
- Entity type.
- Action.
- Table.

Important actions:

- Waiter self-assigned table.
- Waiter opened session.
- Waiter edited/cancelled/reordered item.
- Kitchen changed item status.
- Cashier recorded payment.
- Cashier finalized session.
- Owner changed menu/settings/staff.

## API Areas

Use route handlers under:

```text
/api/restaurants/[slug]/admin/menu
/api/restaurants/[slug]/admin/inventory
/api/restaurants/[slug]/admin/tables
/api/restaurants/[slug]/admin/staff
/api/restaurants/[slug]/admin/settings
/api/restaurants/[slug]/admin/audit-log
```

Every admin endpoint:

1. Verifies staff auth.
2. Verifies role `OWNER`.
3. Scopes query by restaurant slug.
4. Writes audit log for mutations.

## Manual Test Checklist

- Login as `owner@bole.test`.
- Create a new table and generate QR.
- Create a waiter account.
- Assign waiter to Table 1.
- Create a modifier for Doro Wat.
- Reduce an ingredient stock below threshold and confirm menu item unavailable.
- Change service charge and confirm cashier bill changes.
- Force restaurant closed and confirm customer Place Order is blocked.
- View audit log after waiter/kitchen/cashier actions.
