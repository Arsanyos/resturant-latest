import { KitchenStatus, SessionStatus, TenantStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

function daysAgoUtc(days: number): Date {
  const start = startOfTodayUtc();
  return new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
}

export class PlatformQueryError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "PlatformQueryError";
  }
}

export async function getPlatformDashboard() {
  const todayStart = startOfTodayUtc();

  const [
    totalTenants,
    activeTenants,
    suspendedTenants,
    ordersToday,
    revenueAgg,
    activeSessions,
    lowStockIngredients,
  ] = await Promise.all([
    prisma.restaurant.count(),
    prisma.restaurant.count({
      where: { onboardingStatus: TenantStatus.ACTIVE },
    }),
    prisma.restaurant.count({
      where: { onboardingStatus: TenantStatus.SUSPENDED },
    }),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.paymentTransaction.aggregate({
      where: { status: "SUCCESS", createdAt: { gte: todayStart } },
      _sum: { amount: true },
    }),
    prisma.session.count({ where: { status: SessionStatus.ACTIVE } }),
    prisma.ingredient.findMany({
      select: { restaurantId: true, stock: true, lowStockThreshold: true },
    }),
  ]);

  const lowStockTenantIds = new Set(
    lowStockIngredients
      .filter((i) => Number(i.stock) <= Number(i.lowStockThreshold))
      .map((i) => i.restaurantId)
  );

  return {
    totalTenants,
    activeTenants,
    suspendedTenants,
    ordersToday,
    revenueToday: Number(revenueAgg._sum.amount ?? 0),
    activeSessions,
    tenantsWithLowStock: lowStockTenantIds.size,
  };
}

export async function listTenants() {
  const tenants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      tenantType: true,
      onboardingStatus: true,
      isActive: true,
      currency: true,
      subscriptionPlan: true,
      createdAt: true,
      _count: {
        select: { staff: true, tables: true },
      },
    },
  });

  return {
    tenants: tenants.map((tenant) => ({
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      logoUrl: tenant.logoUrl,
      tenantType: tenant.tenantType,
      onboardingStatus: tenant.onboardingStatus,
      isActive: tenant.isActive,
      currency: tenant.currency,
      subscriptionPlan: tenant.subscriptionPlan,
      staffCount: tenant._count.staff,
      tableCount: tenant._count.tables,
      createdAt: tenant.createdAt.toISOString(),
    })),
  };
}

export async function getTenantDetail(tenantId: string) {
  const tenant = await prisma.restaurant.findUnique({
    where: { id: tenantId },
    include: {
      staff: {
        where: { role: "OWNER", isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true },
        take: 1,
      },
    },
  });

  if (!tenant) {
    throw new PlatformQueryError("Tenant not found", 404);
  }

  const todayStart = startOfTodayUtc();
  const weekStart = daysAgoUtc(7);
  const restaurantFilter = { table: { restaurantId: tenantId } };

  const [
    ordersToday,
    ordersLast7,
    revenueTodayAgg,
    revenueLast7Agg,
    activeSessions,
    awaitingKitchen,
    ingredients,
    tableCount,
    staffCount,
    lastAudit,
  ] = await Promise.all([
    prisma.order.count({
      where: { createdAt: { gte: todayStart }, session: restaurantFilter },
    }),
    prisma.order.count({
      where: { createdAt: { gte: weekStart }, session: restaurantFilter },
    }),
    prisma.paymentTransaction.aggregate({
      where: {
        status: "SUCCESS",
        createdAt: { gte: todayStart },
        payment: { session: restaurantFilter },
      },
      _sum: { amount: true },
    }),
    prisma.paymentTransaction.aggregate({
      where: {
        status: "SUCCESS",
        createdAt: { gte: weekStart },
        payment: { session: restaurantFilter },
      },
      _sum: { amount: true },
    }),
    prisma.session.count({
      where: { status: SessionStatus.ACTIVE, table: { restaurantId: tenantId } },
    }),
    prisma.orderItem.count({
      where: {
        kitchenStatus: {
          in: [KitchenStatus.PENDING, KitchenStatus.BEING_PREPARED],
        },
        order: {
          session: {
            status: SessionStatus.ACTIVE,
            table: { restaurantId: tenantId },
          },
        },
      },
    }),
    prisma.ingredient.findMany({
      where: { restaurantId: tenantId },
      select: { stock: true, lowStockThreshold: true },
    }),
    prisma.table.count({ where: { restaurantId: tenantId } }),
    prisma.staff.count({ where: { restaurantId: tenantId } }),
    prisma.auditLog.findFirst({
      where: { restaurantId: tenantId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const lowStockAlerts = ingredients.filter(
    (i) => Number(i.stock) <= Number(i.lowStockThreshold)
  ).length;

  return {
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      logoUrl: tenant.logoUrl,
      tenantType: tenant.tenantType,
      onboardingStatus: tenant.onboardingStatus,
      isActive: tenant.isActive,
      currency: tenant.currency,
      timezone: tenant.timezone,
      subscriptionPlan: tenant.subscriptionPlan,
      notes: tenant.notes,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      instagramUrl: tenant.instagramUrl,
      facebookUrl: tenant.facebookUrl,
      tiktokUrl: tenant.tiktokUrl,
      telegramUrl: tenant.telegramUrl,
      xUrl: tenant.xUrl,
      adImageUrl: tenant.adImageUrl,
      adRedirectUrl: tenant.adRedirectUrl,
      createdAt: tenant.createdAt.toISOString(),
      owner: tenant.staff[0]
        ? {
            id: tenant.staff[0].id,
            name: tenant.staff[0].name,
            email: tenant.staff[0].email,
          }
        : null,
    },
    metrics: {
      ordersToday,
      ordersLast7,
      revenueToday: Number(revenueTodayAgg._sum.amount ?? 0),
      revenueLast7: Number(revenueLast7Agg._sum.amount ?? 0),
      activeSessions,
      awaitingKitchen,
      lowStockAlerts,
      tableCount,
      staffCount,
      lastActivityAt: lastAudit?.createdAt.toISOString() ?? null,
    },
  };
}

export async function getTenantActivity(
  tenantId: string,
  filters: { action?: string; limit: number }
) {
  const tenant = await prisma.restaurant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });

  if (!tenant) {
    throw new PlatformQueryError("Tenant not found", 404);
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      restaurantId: tenantId,
      ...(filters.action ? { action: filters.action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit,
    include: {
      actorStaff: { select: { id: true, name: true, email: true } },
    },
  });

  return {
    entries: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      actorName: log.actorStaff?.name ?? null,
      actorEmail: log.actorStaff?.email ?? null,
      payload: log.payloadJson as Record<string, unknown>,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

export async function getSystemHealth() {
  let database = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const activeTenants24h =
    database === "ok"
      ? (
          await prisma.auditLog.findMany({
            where: { createdAt: { gte: since } },
            distinct: ["restaurantId"],
            select: { restaurantId: true },
          })
        ).length
      : 0;

  return {
    database,
    app: "ok",
    activeTenants24h,
    generatedAt: new Date().toISOString(),
  };
}
