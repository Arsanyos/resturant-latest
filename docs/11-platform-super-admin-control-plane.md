# Phase 11: Platform Super Admin Control Plane

> Status: Proposal / implementation plan for a platform-wide admin area that sits above restaurant owner admin.

## Goal

Build a platform-level admin surface where an internal administrator can manage all tenant restaurants from one place.

This is separate from the existing owner admin at `/r/[slug]/admin`.

Platform admin should be able to:

1. Create a new tenant for a restaurant, cafe, hotel, or food chain.
2. Set tenant branding such as logo and theme colors.
3. View tenant logs and activity.
4. View platform and per-tenant stats such as orders, revenue, active sessions, and system health.

## Why this is needed

The current app is restaurant-scoped:

- `Restaurant` already exists as a first-class model in Prisma.
- Staff auth is tied to one restaurant session.
- Owner admin exists under `/r/[slug]/admin`.
- There is no platform-wide identity, onboarding flow, or control plane.

This means the data model is tenant-aware, but the product currently lacks a control plane for creating and operating tenants at scale.

## Recommendation

Build a separate platform admin area, not an extension of restaurant owner admin.

Recommended route namespace:

```text
/platform
/platform/login
/platform/dashboard
/platform/tenants
/platform/tenants/[tenantId]
/platform/tenants/[tenantId]/activity
/platform/system
```

Reason:

- Keeps platform admin concerns separate from restaurant owner concerns.
- Avoids mixing tenant-scoped auth with platform-scoped auth.
- Makes future billing, onboarding, subscriptions, and support tooling easier to add.

## Roles

### Existing roles

- `OWNER`
- `WAITER`
- `KITCHEN`
- `CASHIER`

These are tenant-local staff roles and should remain that way.

### New platform roles

Recommended:

- `PLATFORM_ADMIN`
- `PLATFORM_SUPPORT` optional later WE ARE NOT BUILD THIS ROLE NOW

Do not reuse `OWNER` for platform-level access. `OWNER` should continue to mean owner of one tenant restaurant.

## Auth design

### Current state

Current session shape is staff-only:

- `staffId`
- `restaurantId`
- `restaurantSlug`
- `role`

Current middleware only understands restaurant/staff access and redirects unauthorized users to `/r/[slug]/staff`.

### Proposed design

Add a separate platform admin session and login flow.

Recommended:

- New cookie: `platform_admin_session`
- New model: `PlatformAdmin`
- Separate auth helpers:
  - `requirePlatformAdmin()`
  - `getPlatformAdminSession()`
- Middleware rules for `/platform/**`

This avoids polluting the current staff session model and prevents cross-scope auth bugs.

## Data model changes

### 1. Add `PlatformAdmin`

Recommended Prisma model:

```prisma
model PlatformAdmin {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         PlatformAdminRole
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum PlatformAdminRole {
  PLATFORM_ADMIN
}
```

### 2. Extend `Restaurant`

Recommended additions:

```prisma
model Restaurant {
  // existing fields...
  tenantType        TenantType      @default(CAFE)
  subscriptionPlan  String?
  onboardingStatus  TenantStatus    @default(ACTIVE)
  notes             String?
}

enum TenantType {
  RESTAURANT
  CAFE
  HOTEL
  FOOD_CHAIN
  OTHER
}

enum TenantStatus {
  DRAFT
  ACTIVE
  SUSPENDED
  ARCHIVED
}
```

Notes:

- `tenantType` lets you distinguish cafe vs hotel vs restaurant.
- `onboardingStatus` gives lifecycle control.
- `subscriptionPlan` is optional now but useful later.

### 3. Add platform audit logs

Current audit logs are restaurant-scoped. Keep those for tenant operations.

Add a second log for platform actions:

```prisma
model PlatformAuditLog {
  id              String   @id @default(cuid())
  platformAdminId String
  action          String
  entityType      String
  entityId        String
  payloadJson     Json?
  createdAt       DateTime @default(now())

  platformAdmin PlatformAdmin @relation(fields: [platformAdminId], references: [id])
}
```

Use this for actions like:

- `PLATFORM_CREATED_TENANT`
- `PLATFORM_UPDATED_TENANT_BRANDING`
- `PLATFORM_SUSPENDED_TENANT`
- `PLATFORM_RESET_OWNER_PASSWORD`

## Product scope

### 1. Tenant creation

Platform admin can create a new tenant with:

- Business name
- Slug
- Tenant type
- Currency
- Timezone
- Primary color
- Secondary color
- Logo URL
- Contact fields optional
- Initial owner account

Recommended creation flow:

1. Create restaurant record.
2. Create owner staff account for that restaurant.
3. Seed default tables optionally.
4. Seed starter menu optionally.
5. Write platform audit log.

Recommended route:

```text
POST /api/platform/tenants
```

Request body:

```json
{
  "name": "Booty Cafe",
  "slug": "booty-cafe",
  "tenantType": "CAFE",
  "currency": "ETB",
  "timezone": "Africa/Addis_Ababa",
  "primaryColor": "#F97316",
  "secondaryColor": "#111827",
  "logoUrl": "https://...",
  "owner": {
    "name": "Booty Owner",
    "email": "owner@booty.test",
    "password": "password"
  },
  "setup": {
    "seedDefaultTables": true,
    "defaultTableCount": 12,
    "seedStarterMenu": true
  }
}
```

### 2. Tenant branding management

Platform admin should be able to update:

- Logo
- Name
- Primary color
- Secondary color
- Social links
- Active / suspended status

Recommended routes:

```text
GET   /api/platform/tenants/[tenantId]
PATCH /api/platform/tenants/[tenantId]
```

### 3. Tenant activity and logs

The platform admin should be able to inspect:

- Tenant audit logs
- Recent orders
- Payment activity
- Active sessions
- Last staff activity

Recommended approach:

- Reuse existing `AuditLog` for tenant-local operational history.
- Add platform audit log for platform actions.
- Build a tenant detail page with a tabbed activity view:
  - Overview
  - Branding
  - Staff
  - Activity
  - Health

Recommended routes:

```text
GET /api/platform/tenants/[tenantId]/overview
GET /api/platform/tenants/[tenantId]/activity
GET /api/platform/tenants/[tenantId]/health
```

### 4. Platform dashboard

The platform dashboard should answer two questions:

1. What is happening across all tenants right now?
2. Which tenants need attention?

Recommended widgets:

- Total tenants
- Active tenants
- Suspended tenants
- Orders today across all tenants
- Revenue today across all tenants
- Active sessions right now
- Tenants with low stock alerts
- Tenants with failed payment verifications
- Tenants with no recent activity

Recommended routes:

```text
GET /api/platform/dashboard
GET /api/platform/system/health
```

### 5. Per-tenant stats

For each tenant, platform admin should see:

- Orders today
- Orders last 7 days
- Revenue today
- Revenue last 7 days
- Active sessions
- Open tables
- Awaiting kitchen items
- Low stock alerts
- Latest audit events
- Last successful order/payment timestamp

## System health

For the first version, keep this simple and app-level.

Recommended health cards:

- Database reachable
- Recent API error count optional
- Websocket / realtime connected optional
- Background job status optional
- Number of tenants with activity in last 24h

MVP health route:

```text
GET /api/platform/system/health
```

Response can start with:

```json
{
  "database": "ok",
  "app": "ok",
  "generatedAt": "2026-07-02T08:00:00.000Z"
}
```

## UI structure

Recommended files:

```text
src/app/platform/login/page.tsx
src/app/platform/layout.tsx
src/app/platform/dashboard/page.tsx
src/app/platform/tenants/page.tsx
src/app/platform/tenants/new/page.tsx
src/app/platform/tenants/[tenantId]/page.tsx
src/app/platform/system/page.tsx

src/features/platform-admin/components/
  PlatformLayout.tsx
  PlatformSidebar.tsx
  PlatformHeader.tsx
  PlatformDashboard.tsx
  TenantTable.tsx
  TenantCreateForm.tsx
  TenantBrandingForm.tsx
  TenantStatsCards.tsx
  TenantActivityTable.tsx
  SystemHealthCards.tsx
```

Recommended navigation:

- Dashboard
- Tenants
- System
- Audit

Tenant detail page tabs:

- Overview
- Branding
- Activity
- Health

## API plan

Recommended API surface:

```text
POST /api/platform/auth/login
POST /api/platform/auth/logout
GET  /api/platform/auth/me

GET  /api/platform/dashboard
GET  /api/platform/system/health

GET  /api/platform/tenants
POST /api/platform/tenants
GET  /api/platform/tenants/[tenantId]
PATCH /api/platform/tenants/[tenantId]

GET  /api/platform/tenants/[tenantId]/overview
GET  /api/platform/tenants/[tenantId]/activity
GET  /api/platform/tenants/[tenantId]/health
```

Optional later:

```text
POST /api/platform/tenants/[tenantId]/impersonate-owner
POST /api/platform/tenants/[tenantId]/suspend
POST /api/platform/tenants/[tenantId]/reactivate
POST /api/platform/tenants/[tenantId]/seed-demo-data
```

## Query/service layer plan

Recommended new files:

```text
src/lib/platform-admin/
  queries.ts
  service.ts
  auth.ts

src/lib/validation/
  platform-admin.ts
  platform-tenant.ts
```

Responsibilities:

- `queries.ts`: aggregated dashboard and tenant detail queries
- `service.ts`: create tenant, update tenant branding, health assembly
- `auth.ts`: session and role helpers

## Implementation phases

### Phase A: Foundation

- Add `PlatformAdmin` model
- Add platform session handling
- Add `/platform/login`
- Add middleware support for `/platform/**`
- Seed one default platform admin

### Phase B: Tenant management

- Add tenant create API
- Add tenant list page
- Add tenant detail page
- Add branding update form

### Phase C: Stats and activity

- Add platform dashboard API
- Add per-tenant overview metrics
- Add tenant activity page using existing `AuditLog`
- Add platform audit logging

### Phase D: Health and operations

- Add system health page
- Add tenant status controls: suspend/reactivate
- Add optional support actions

## Key implementation rules

1. Do not overload the current `OWNER` role with platform rights.
2. Do not reuse the current staff session cookie for platform admin.
3. Keep tenant audit logs and platform audit logs separate.
4. Keep `/platform/**` routing entirely separate from `/r/[slug]/**`.
5. Reuse existing restaurant analytics queries where possible, then add cross-tenant aggregations above them.

## Risks

### Auth confusion

If platform admin and tenant staff share one session model, authorization bugs become likely.

Mitigation:

- Separate cookie
- Separate middleware branch
- Separate auth helper

### Cross-tenant data leaks

Aggregated queries can accidentally expose data outside intended scope.

Mitigation:

- All tenant detail queries must take explicit `tenantId`
- All platform endpoints require `requirePlatformAdmin()`

### Slow dashboard queries

Cross-tenant metrics may become expensive.

Mitigation:

- Start with direct Prisma aggregates
- Add caching or materialized snapshots later if needed

## Recommended first MVP

If you want the highest-value version first, ship this sequence:

1. Platform login
2. Tenant list
3. Create tenant
4. Update tenant branding
5. Tenant detail page with stats
6. Tenant activity log
7. Platform dashboard

This would immediately solve your main operational problem: creating and managing cafes centrally.

## Open questions

These decisions will affect the implementation:

1. Should platform admin create only one tenant at a time, or also create multi-branch groups later?
2. When creating a tenant, should the system auto-seed:
   - default tables
   - starter menu
   - demo staff accounts
3. Do you want platform admin to log in from a dedicated URL like `/platform/login`, or from the main homepage?
4. Should platform admin be allowed to impersonate a tenant owner for support/debugging?
5. For "system health", do you want only app health and tenant activity, or real infrastructure checks later too?

## Suggested decisions

Recommended defaults for MVP:

- Dedicated platform login at `/platform/login`
- One tenant at a time
- Auto-seed owner + default tables
- Starter menu optional checkbox
- No impersonation in MVP
- Simple app-level health only in MVP

## Acceptance checklist

- [ ] Platform admin can log in
- [ ] Platform admin can create a new tenant
- [ ] New tenant gets owner account and initial setup
- [ ] Platform admin can edit tenant branding
- [ ] Platform admin can view tenant logs
- [ ] Platform admin can view per-tenant stats
- [ ] Platform admin can view cross-tenant dashboard metrics
- [ ] Platform admin can see basic system health

## Next step

After this spec is approved, implementation should start with schema + auth foundation before any UI work.
