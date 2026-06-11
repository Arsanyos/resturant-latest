# UI Design System and Pixel Guide

## Goal

Preserve the Lovable prototype feel while implementing the production Next.js app. This guide gives Cursor enough visual constraints to keep screens consistent across actors.

## Visual Theme

The app should feel warm, modern, and operationally calm. Use a Bole Cafe demo identity:

- Warm cream page background.
- Orange primary actions.
- Deep navy selected states and dark panels.
- Soft borders and rounded cards.
- High whitespace on customer views.
- Denser but still readable dashboards for staff.

## Design Tokens

Use semantic CSS variables rather than hard-coded colors in components.

Suggested tokens:

```css
:root {
  --background: #fbf6ef;
  --foreground: #111827;
  --card: #fffaf3;
  --card-border: #eadfce;
  --primary: #f97316;
  --primary-foreground: #ffffff;
  --secondary: #111827;
  --secondary-foreground: #ffffff;
  --muted: #f2eadf;
  --muted-foreground: #6b7280;
  --success: #16a34a;
  --warning: #f59e0b;
  --danger: #dc2626;
  --radius-card: 24px;
  --radius-pill: 999px;
}
```

Restaurant bootstrap colors can override `--primary` and `--secondary`.

## Typography

- Use a clean sans-serif font.
- Page hero: bold, large, tight line-height.
- Cards: medium title, muted supporting copy.
- Staff dashboards: readable 14-16px body text.
- Amharic must wrap naturally; do not force fixed-width labels.

## Shared Components

Build these once and reuse:

- `RestaurantHeader`
- `LanguageToggle`
- `RoleBadge`
- `StatusChip`
- `Money`
- `EmptyState`
- `AppCard`
- `SegmentedControl`
- `ItemDrawer`
- `TableStatusCard`
- `OrderStatusList`
- `ActivityLog`

## Landing Page

Route: `/`

Layout:

- Header with brand mark, Bole Cafe name, subtitle, language toggle.
- Hero left: large headline.
- Hero right: dashboard preview card with ETB revenue and table grid.
- CTA buttons:
  - Try customer flow.
  - Open Kitchen KDS.
- Role cards:
  - Customer
  - Waiter
  - Kitchen (KDS)
  - Cashier
  - Owner/Admin
- Bottom dark feature strip:
  - Mobile-first.
  - Tablet kitchen.
  - Bilingual ready.

Pixel notes:

- Use large rounded cards.
- Orange CTA should be the strongest visual element.
- Role cards should use small colored top bars.

## Customer UI

Route: `/r/[slug]/t/[table]`

Layout:

- Centered mobile column on larger screens, max width around 430-520px.
- Sticky top restaurant/table header.
- Top tab nav: Menu, Cart, Orders, Pay.
- Selected top tab uses deep navy pill.
- Category tabs are horizontal scroll pills.
- Active category uses orange.

Menu item card:

- White/cream card.
- Title, description, price.
- Orange square add button at right.
- Subtle border.
- Large tap target.

Item drawer:

- Bottom sheet on mobile.
- Center modal is acceptable on wide screens.
- Title and description at top.
- Modifier rows with checkboxes and price delta at right.
- Text area for notes.
- Sticky bottom bar with quantity stepper and orange `Add to cart` button.

Cart:

- Item rows with edit/remove.
- Bottom total summary.
- Orange `Place order` button.

Orders:

- Group by order number.
- Status chips per item.
- Timeline feel but keep simple.

Pay:

- Disabled state when kitchen not done.
- Bill summary once payable.
- Mock Telebirr button.
- Verification pending state on mock failure.

## Kitchen UI

Route: `/r/[slug]/kitchen`

Layout:

- Full-width tablet/desktop.
- Header with time filters.
- Main KDS area plus activity log sidebar.
- Empty state large and centered.

Order cards:

- Group by table.
- Show order number and timestamp.
- Item rows must be easy to scan from a distance.
- Status action buttons large enough for touch.

Status color guidance:

- Pending: strong orange/warning.
- Being prepared: navy or amber emphasis.
- Served: green/success.
- Cancelled: muted/danger outline.

## Waiter UI

Route: `/r/[slug]/waiter`

Layout:

- Tablet dashboard.
- Table grid with status chips.
- Assistance inbox visible.
- Table detail drawer from right or modal panel.

Table cards:

- Table number prominent.
- Status chip.
- Assigned waiter info.
- Assistance badge if needed.
- Read-only indicator for unassigned tables.

Mutation buttons must be disabled with explanatory copy when table is not assigned/self-assigned.

## Cashier UI

Route: `/r/[slug]/cashier`

Layout:

- Desktop/tablet split view.
- Left list of active sessions.
- Right detailed bill.
- Verification queue card or tab.

Bill:

- Money columns aligned.
- Clear subtotal, service charge, VAT, total due, total paid, balance.
- Payment buttons disabled until served.
- Finalize button only active when balance is zero for cash/mixed paths.

## Admin UI

Route: `/r/[slug]/admin`

Layout:

- Desktop sidebar.
- Top header with restaurant context.
- CRUD forms in cards.
- Tables for lists.

Sections:

- Dashboard.
- Menu.
- Inventory and Recipes.
- Tables and QR.
- Staff.
- Settings.
- Audit Log.

QR generator:

- Show generated URL.
- Show QR preview.
- Download and copy actions.

## Empty States

Every list needs an empty state:

- Kitchen: All clear.
- Cashier: No active sessions.
- Waiter: No assistance requests.
- Admin menu: No items yet.
- Customer cart: Your cart is empty.

## Responsive Rules

- Customer: design mobile first.
- Staff dashboards: tablet first, still usable on desktop.
- Admin: desktop first, acceptable tablet.
- Avoid cramming staff dashboards into phone layouts for MVP.

## i18n UI Rules

- Language toggle on every surface.
- Persist selected language in `localStorage`.
- Use translation keys for all UI text.
- Menu/category/modifier labels come from i18n keys.
- Amharic strings can be longer; allow wrapping and avoid fixed-height cards where text appears.

## Accessibility

- Buttons require visible focus states.
- Status chips must not rely on color only; include text.
- Drawer close button must be keyboard accessible.
- Forms need labels, not placeholders only.
- Money amounts should include ETB text.

## Pixel Acceptance Checklist

- Landing visually matches warm cream/orange/navy prototype.
- Customer route looks like a mobile app inside browser.
- Item drawer has sticky bottom action and quantity stepper.
- Kitchen KDS has big touch targets and obvious empty state.
- Cashier bill aligns money totals clearly.
- Admin uses stable sidebar navigation.
- EN/Amharic toggle does not break layout.
