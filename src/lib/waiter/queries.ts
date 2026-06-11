import {
  AssistanceStatus,
  KitchenStatus,
  SessionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getShiftDate } from "./shift";

export async function getActiveTables(restaurantId: string) {
  return prisma.table.findMany({
    where: { restaurantId, isActive: true },
    orderBy: { number: "asc" },
  });
}

export async function getTodayAssignments(restaurantId: string) {
  const shiftDate = getShiftDate();
  return prisma.staffTableAssignment.findMany({
    where: {
      shiftDate,
      table: { restaurantId },
    },
    include: {
      staff: { select: { id: true, name: true } },
      table: { select: { id: true } },
    },
  });
}

export async function isStaffAssignedToTable(
  staffId: string,
  tableId: string
): Promise<boolean> {
  const shiftDate = getShiftDate();
  const assignment = await prisma.staffTableAssignment.findFirst({
    where: { staffId, tableId, shiftDate },
  });
  return !!assignment;
}

export async function getActiveSessionsByRestaurant(restaurantId: string) {
  return prisma.session.findMany({
    where: {
      status: SessionStatus.ACTIVE,
      table: { restaurantId },
    },
    include: {
      orders: { include: { items: true } },
      payment: true,
    },
  });
}

export async function getPendingAssistanceCounts(restaurantId: string) {
  const requests = await prisma.waiterAssistanceRequest.findMany({
    where: {
      status: AssistanceStatus.PENDING,
      tableId: {
        in: (
          await prisma.table.findMany({
            where: { restaurantId },
            select: { id: true },
          })
        ).map((t) => t.id),
      },
    },
    select: { tableId: true },
  });

  const counts = new Map<string, number>();
  for (const req of requests) {
    counts.set(req.tableId, (counts.get(req.tableId) ?? 0) + 1);
  }
  return counts;
}

export async function getAssistanceRequestsForRestaurant(restaurantId: string) {
  const tableIds = (
    await prisma.table.findMany({
      where: { restaurantId },
      select: { id: true },
    })
  ).map((t) => t.id);

  return prisma.waiterAssistanceRequest.findMany({
    where: {
      tableId: { in: tableIds },
      status: { in: [AssistanceStatus.PENDING, AssistanceStatus.ACKNOWLEDGED] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getTableByIdInRestaurant(
  tableId: string,
  restaurantId: string
) {
  return prisma.table.findFirst({
    where: { id: tableId, restaurantId },
  });
}

export function sessionHasAwaitingPayment(
  items: { kitchenStatus: KitchenStatus }[],
  paymentStatus: string | undefined
): boolean {
  if (items.length === 0) return false;
  const allDone = items.every(
    (i) =>
      i.kitchenStatus === KitchenStatus.SERVED ||
      i.kitchenStatus === KitchenStatus.CANCELLED
  );
  return allDone && paymentStatus !== "PAID";
}
