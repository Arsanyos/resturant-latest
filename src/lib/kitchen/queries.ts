import { SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function getActiveSessionsWithOrders(restaurantId: string) {
  return prisma.session.findMany({
    where: {
      status: SessionStatus.ACTIVE,
      table: { restaurantId },
    },
    include: {
      table: true,
      orders: {
        orderBy: { orderNumber: "asc" },
        include: {
          items: {
            include: {
              menuItem: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { table: { number: "asc" } },
  });
}

export async function getOrderItemWithContext(orderItemId: string) {
  return prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      menuItem: { select: { name: true } },
      order: {
        include: {
          session: {
            include: {
              table: { include: { restaurant: true } },
            },
          },
        },
      },
    },
  });
}

export async function getKitchenAuditLogs(restaurantId: string, limit = 50) {
  return prisma.auditLog.findMany({
    where: {
      restaurantId,
      action: { in: ["ORDER_ITEM_STATUS_CHANGED", "ORDER_PLACED"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
