# Build Order and Acceptance Checklists

## Goal

Use this file to drive Cursor implementation phase by phase. Do not jump ahead to advanced payment or SaaS operations before the core customer-to-kitchen flow works end to end.

## Recommended Build Order

1. Project scaffold and design tokens.
2. Prisma schema, migration, and seed.
3. Staff auth and role guards.
4. Public restaurant/table bootstrap.
5. Customer menu, drawer, cart, and place order.
6. WebSocket hub and `order.placed` event.
7. Kitchen KDS and item status events.
8. Waiter dashboard and assistance requests.
9. Cashier billing and payment finalization.
10. Admin operations.
11. Polish, i18n, QA, and edge cases.
12. Monetization build gaps (future; see Phase 9 below and `docs/10-monetization-pricing.md`).

## Phase 0: Scaffold

Tasks:

- Create Next.js App Router project with TypeScript.
- Configure styling and semantic tokens.
- Add Prisma and PostgreSQL connection.
- Add shared layout components.
- Add route placeholders for every actor.

Done when:

- App runs locally.
- `/` landing page exists.
- All role routes render placeholder shells.
- Design tokens are used instead of hard-coded theme colors in most components.

## Phase 1: Foundation

Reference: `docs/01-foundation-data-auth.md`

Tasks:

- Add Prisma schema.
- Run migration.
- Seed Bole Cafe.
- Add staff login/logout/me APIs.
- Add route guards.
- Add public bootstrap endpoint.
- Add customer device-token session creation.

Done when:

- Demo users can login.
- Wrong roles are blocked.
- Customer route can bootstrap Bole Cafe Table 1.
- Device token is stored in `localStorage` and hashed server-side.

## Phase 2: Customer Ordering

Reference: `docs/02-customer-ordering-phase.md`

Tasks:

- Build customer shell and tabs.
- Build menu category tabs and item cards.
- Build item drawer with variants, modifiers, notes, quantity.
- Build cart.
- Implement Place Order API.
- Build Orders tab.
- Build Pay tab disabled state.

Done when:

- Clicking a menu item opens drawer.
- Add to cart shows item in Cart.
- Place Order creates database order and clears cart.
- Orders tab shows item as Pending.

## Phase 3: Realtime Base

Reference: `docs/07-realtime-communication-contracts.md`

Tasks:

- Add simple Node WebSocket hub.
- Add client subscribe hook.
- Publish `order.placed` after Place Order.
- Refetch kitchen/customer data after events.

Done when:

- Customer places Doro Wat.
- Kitchen tab receives the order without browser refresh.
- Reconnect refetches current data.

## Phase 4: Kitchen KDS

Reference: `docs/03-kitchen-kds-phase.md`

Tasks:

- Build KDS route.
- Query active sessions grouped by table/order.
- Add time filters.
- Add status transition API.
- Add activity log.
- Publish `order_item.status_changed`.

Done when:

- Kitchen sees pending order.
- Kitchen moves item to Being prepared, then Served.
- Customer Orders tab updates.
- Cashier ready-to-pay state can update after Served.

## Phase 5: Waiter

Reference: `docs/04-waiter-phase.md`

Tasks:

- Build waiter table grid.
- Add self-assign API.
- Add assistance request inbox.
- Add waiter-started session API.
- Add table detail panel.
- Add waiter order placement.
- Add edit/cancel/reorder APIs with audit logs.

Done when:

- Waiter sees all tables.
- Waiter self-assigns Table 1.
- Waiter opens session without device binding.
- Customer scan shows waiter-opened message.
- Waiter can place order and Kitchen receives it.
- Blocked customer request appears in waiter inbox.

## Phase 6: Cashier

Reference: `docs/05-cashier-payment-phase.md`

Tasks:

- Build active session list.
- Build session bill detail.
- Calculate subtotal, service charge, VAT, total, paid, balance.
- Lock payment until all items served.
- Add cash transaction API.
- Add finalize payment API.
- Add mock Telebirr flow and verification queue.
- Add receipt screen.

Done when:

- Cashier sees Table 1 bill.
- Payment is locked before kitchen serves.
- Cashier can record partial cash.
- Cashier can finalize full cash/mixed payment.
- Full mock Telebirr auto-closes session.
- Mock Telebirr failure enters verification queue.

## Phase 7: Admin

Reference: `docs/06-admin-restaurant-ops-phase.md`

Tasks:

- Build admin sidebar.
- Build dashboard.
- Build menu CRUD.
- Build variants/modifiers CRUD.
- Build inventory/recipe management.
- Build tables and QR generator.
- Build staff CRUD and table assignment.
- Build settings.
- Build audit log.

Done when:

- Owner can update menu and see customer menu change.
- Owner can generate QR for table.
- Owner can assign waiter to table.
- Owner can update service/tax settings and cashier bill reflects it.
- Owner can view audit logs from all staff actions.

## Phase 8: i18n and Polish

Tasks:

- Add `en.json` and `am.json`.
- Replace hard-coded UI text with translation keys.
- Persist language selection.
- Verify Amharic layout wrapping.
- Add all empty/error states.
- Add loading states and form validation.

Done when:

- Language toggle works on every surface.
- Customer, waiter, kitchen, cashier, and admin remain usable in both languages.
- No major layout shift breaks on Amharic.

## End-to-End QA Flows

### Customer to Kitchen

1. Open `/r/bole-cafe/t/1`.
2. Add Doro Wat with Extra injera.
3. Place order.
4. Open `/r/bole-cafe/kitchen`.
5. Confirm order appears as Pending.

### Kitchen to Customer

1. Kitchen advances item to Being prepared.
2. Customer Orders tab updates.
3. Kitchen advances item to Served.
4. Customer Pay tab enables.

### Payment

1. Cashier opens `/r/bole-cafe/cashier`.
2. Select Table 1.
3. Confirm total due.
4. Record cash payment.
5. Finalize.
6. Customer token clears after session closure.

### Blocked Device

1. Start customer session on one browser profile.
2. Open same table in another browser/profile without token.
3. Confirm blocked-device screen.
4. Request waiter assistance.
5. Waiter inbox receives request.

### Waiter-Started Session

1. Waiter opens session for Table 2.
2. Customer scans Table 2.
3. Customer sees waiter-opened message.
4. Waiter places order.
5. Kitchen receives order.

## Phase 9: Monetization Build Gaps (Future)

Reference: `docs/10-monetization-pricing.md`

These features are sold (or planned to be sold) in the Professional and Premium tiers but are **not built yet**. Track them here so the sales packaging never promises more than the product ships. Until each item is delivered, the corresponding tier feature must be sold as a phased custom build, not a fixed-price commitment.

| Gap | Sold in tier | Current state | Needed for |
| --- | --- | --- | --- |
| Real Telebirr integration | All (production payments) | Mock only (`/api/payments/telebirr/mock`) | Live in-production customer payments |
| Sales reports | Professional, Premium | Not built (audit log + partial dashboard only) | "Monthly sales report" promise |
| Advanced analytics / reporting dashboard | Premium | Not built | Premium "business analytics" |
| Loyalty and rewards program | Premium | Not built | Premium loyalty/rewards |
| Customer database management | Premium | Not built | Premium customer DB |
| Marketing tools / customer engagement | Premium | Not built | Premium marketing/engagement |
| Automated billing + self-serve multi-tenant onboarding | Platform (all tiers) | Not built ("SaaS super-admin not in Phase 1") | Charging customers without manual invoicing |

Tasks (when prioritized):

- Build real Telebirr payment integration to replace the mock flow.
- Build sales reporting (per-day/week/month revenue, item mix) for Professional.
- Build an advanced analytics dashboard for Premium.
- Build loyalty/rewards and customer database for Premium.
- Build marketing/customer-engagement tooling for Premium.
- Build platform billing + tenant onboarding so monthly/setup fees are collected automatically instead of by manual invoice.

Done when:

- No tier in `docs/10-monetization-pricing.md` advertises a feature that is not shippable.
- Premium can be sold at a fixed price (its features exist), or it remains explicitly custom-quote until then.
- Recurring fees are billable without manual invoicing.

## Non-Goals for MVP

- Real Telebirr integration.
- Redis or cross-instance WebSocket scale-out.
- Native mobile app.
- Discounts.
- Walk-out automation.
- Physical printer integration.
- SaaS super-admin console.

## Final Definition of Done

The MVP is ready for a demo when:

- All actor routes exist and are role protected where needed.
- Customer can place an order from QR to kitchen.
- Kitchen status changes flow back to customer.
- Waiter can assist and open sessions.
- Cashier can finalize cash/mixed payments.
- Full mock Telebirr can auto-close.
- Admin can configure core restaurant data.
- Audit logs capture staff mutations.
- EN/Amharic toggle is present everywhere.
- Data survives refresh because PostgreSQL is the source of truth.
