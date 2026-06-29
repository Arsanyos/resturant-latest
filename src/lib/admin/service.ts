import {
  KitchenStatus,
  SessionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveRestaurantBySlug } from "@/lib/restaurants/service";

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

export class AdminError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "AdminError";
  }
}

export async function getDashboardMetrics(slug: string) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) {
    throw new AdminError("Restaurant not found", 404);
  }

  const todayStart = startOfTodayUtc();

  const [
    openSessions,
    ordersToday,
    revenueAgg,
    awaitingKitchen,
    ingredients,
  ] = await Promise.all([
    prisma.session.count({
      where: {
        status: SessionStatus.ACTIVE,
        table: { restaurantId: restaurant.id },
      },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: todayStart },
        session: { table: { restaurantId: restaurant.id } },
      },
    }),
    prisma.paymentTransaction.aggregate({
      where: {
        status: "SUCCESS",
        createdAt: { gte: todayStart },
        payment: {
          session: { table: { restaurantId: restaurant.id } },
        },
      },
      _sum: { amount: true },
    }),
    prisma.orderItem.count({
      where: {
        kitchenStatus: {
          in: [KitchenStatus.PENDING, KitchenStatus.BEING_PREPARED],
        },
        order: {
          session: {
            status: SessionStatus.ACTIVE,
            table: { restaurantId: restaurant.id },
          },
        },
      },
    }),
    prisma.ingredient.findMany({
      where: { restaurantId: restaurant.id },
      select: { stock: true, lowStockThreshold: true },
    }),
  ]);

  const lowStock = ingredients.filter(
    (i) => Number(i.stock) <= Number(i.lowStockThreshold)
  ).length;

  return {
    openSessions,
    activeTables: openSessions,
    ordersToday,
    revenueToday: Number(revenueAgg._sum.amount ?? 0),
    itemsAwaitingKitchen: awaitingKitchen,
    lowStockAlerts: lowStock,
  };
}

export async function getAuditLogs(
  slug: string,
  filters: {
    from?: string;
    to?: string;
    action?: string;
    staffId?: string;
    limit: number;
  }
) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) {
    throw new AdminError("Restaurant not found", 404);
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      restaurantId: restaurant.id,
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.staffId ? { actorStaffId: filters.staffId } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
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

export async function getSettings(slug: string) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) {
    throw new AdminError("Restaurant not found", 404);
  }

  return {
    name: restaurant.name,
    logoUrl: restaurant.logoUrl,
    primaryColor: restaurant.primaryColor,
    secondaryColor: restaurant.secondaryColor,
    taxPct: Number(restaurant.taxPct),
    servicePct: Number(restaurant.servicePct),
    timezone: restaurant.timezone,
    manualOpen: restaurant.manualOpen,
    openingHours: restaurant.openingHours,
    currency: restaurant.currency,
  };
}

export async function updateSettings(
  slug: string,
  input: Record<string, unknown>,
  staffId: string
) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) {
    throw new AdminError("Restaurant not found", 404);
  }

  const before = {
    taxPct: Number(restaurant.taxPct),
    servicePct: Number(restaurant.servicePct),
    manualOpen: restaurant.manualOpen,
    name: restaurant.name,
  };

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.restaurant.update({
      where: { id: restaurant.id },
      data: {
        name: input.name as string | undefined,
        logoUrl: input.logoUrl as string | null | undefined,
        primaryColor: input.primaryColor as string | undefined,
        secondaryColor: input.secondaryColor as string | undefined,
        taxPct: input.taxPct as number | undefined,
        servicePct: input.servicePct as number | undefined,
        timezone: input.timezone as string | undefined,
        manualOpen: input.manualOpen as boolean | null | undefined,
        openingHours: input.openingHours as object | undefined,
      },
    });

    await tx.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        entityType: "Restaurant",
        entityId: restaurant.id,
        action: "OWNER_UPDATED_SETTINGS",
        actorType: "STAFF",
        actorStaffId: staffId,
        payloadJson: { before, after: input } as object,
      },
    });

    return record;
  });

  return {
    name: updated.name,
    logoUrl: updated.logoUrl,
    primaryColor: updated.primaryColor,
    secondaryColor: updated.secondaryColor,
    taxPct: Number(updated.taxPct),
    servicePct: Number(updated.servicePct),
    timezone: updated.timezone,
    manualOpen: updated.manualOpen,
    openingHours: updated.openingHours,
    currency: updated.currency,
  };
}
