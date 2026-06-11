import { SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function loadPaymentWithContext(paymentId: string) {
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      session: {
        include: {
          table: { include: { restaurant: true } },
          orders: { include: { items: true } },
        },
      },
      transactions: {
        orderBy: { createdAt: "asc" },
        include: {
          payment: false,
        },
      },
    },
  });
}

export async function loadSessionBillContext(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      table: { include: { restaurant: true } },
      orders: {
        orderBy: { orderNumber: "asc" },
        include: {
          items: {
            include: { menuItem: { select: { nameI18nKey: true } } },
          },
        },
      },
      payment: {
        include: {
          transactions: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
}

export async function loadActiveSessionsForRestaurant(restaurantId: string) {
  return prisma.session.findMany({
    where: {
      status: SessionStatus.ACTIVE,
      table: { restaurantId },
    },
    include: {
      table: true,
      orders: { include: { items: true } },
      payment: {
        include: { transactions: true },
      },
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function loadPendingTelebirrTransactions(restaurantId: string) {
  return prisma.paymentTransaction.findMany({
    where: {
      method: "TELEBIRR",
      telebirrStatus: { in: ["PENDING_VERIFICATION", "FAILED"] },
      payment: {
        session: {
          status: SessionStatus.ACTIVE,
          table: { restaurantId },
        },
      },
    },
    include: {
      payment: {
        include: {
          session: {
            include: { table: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
