import { StaffRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { publishRealtimeEvent } from "@/lib/realtime/publisher";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getShiftDate } from "./shift";

export async function getAssignedWaiterForTable(
  tableId: string
): Promise<string | null> {
  const shiftDate = getShiftDate();
  const assignment = await prisma.staffTableAssignment.findFirst({
    where: {
      tableId,
      shiftDate,
      staff: { role: StaffRole.WAITER, isActive: true },
    },
    orderBy: { createdAt: "asc" },
    select: { staffId: true },
  });

  return assignment?.staffId ?? null;
}

type EnsureTableAssignmentOptions = {
  assignedById?: string | null;
  restaurantId?: string;
  actorStaffId?: string;
  auditAction?: string;
  skipAudit?: boolean;
  skipEvent?: boolean;
};

export async function ensureTableAssignment(
  staffId: string,
  tableId: string,
  options: EnsureTableAssignmentOptions = {}
) {
  const shiftDate = getShiftDate();

  const assignment = await prisma.staffTableAssignment.upsert({
    where: {
      staffId_tableId_shiftDate: {
        staffId,
        tableId,
        shiftDate,
      },
    },
    create: {
      staffId,
      tableId,
      shiftDate,
      assignedById: options.assignedById ?? null,
    },
    update: {
      ...(options.assignedById !== undefined
        ? { assignedById: options.assignedById }
        : {}),
    },
    include: {
      staff: { select: { id: true, name: true } },
      table: { select: { id: true, number: true, restaurantId: true } },
    },
  });

  const restaurantId =
    options.restaurantId ?? assignment.table.restaurantId;

  if (!options.skipAudit && options.auditAction && options.actorStaffId) {
    await prisma.auditLog.create({
      data: {
        restaurantId,
        entityType: "StaffTableAssignment",
        entityId: assignment.id,
        action: options.auditAction,
        actorType: "STAFF",
        actorStaffId: options.actorStaffId,
        payloadJson: {
          tableId,
          tableNumber: assignment.table.number,
          staffId,
          staffName: assignment.staff.name,
        },
      },
    });
  }

  if (!options.skipEvent) {
    await publishRealtimeEvent({
      event: REALTIME_EVENTS.TABLE_ASSIGNMENT_CHANGED,
      restaurantId,
      payload: {
        tableId,
        tableNumber: assignment.table.number,
        staffId,
        staffName: assignment.staff.name,
      },
    });
  }

  return assignment;
}
