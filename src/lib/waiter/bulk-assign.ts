import { prisma } from "@/lib/db/prisma";
import type { StaffSessionData } from "@/lib/auth/session";
import { publishRealtimeEvent } from "@/lib/realtime/publisher";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getShiftDate } from "@/lib/waiter/shift";

export class BulkAssignError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "BulkAssignError";
  }
}

export async function bulkAssignTables(
  staff: StaffSessionData,
  input: { staffId: string; tableIds: string[]; shiftDate?: string }
) {
  const target = await prisma.staff.findFirst({
    where: {
      id: input.staffId,
      restaurantId: staff.restaurantId,
      isActive: true,
    },
  });

  if (!target) {
    throw new BulkAssignError("Staff not found", 404);
  }

  const shiftDate = input.shiftDate
    ? new Date(input.shiftDate)
    : getShiftDate();

  const tables = await prisma.table.findMany({
    where: {
      id: { in: input.tableIds },
      restaurantId: staff.restaurantId,
    },
  });

  if (tables.length !== input.tableIds.length) {
    throw new BulkAssignError("One or more tables not found", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.staffTableAssignment.deleteMany({
      where: {
        staffId: input.staffId,
        shiftDate,
      },
    });

    for (const tableId of input.tableIds) {
      await tx.staffTableAssignment.upsert({
        where: {
          staffId_tableId_shiftDate: {
            staffId: input.staffId,
            tableId,
            shiftDate,
          },
        },
        create: {
          staffId: input.staffId,
          tableId,
          shiftDate,
          assignedById: staff.staffId,
        },
        update: {
          assignedById: staff.staffId,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        restaurantId: staff.restaurantId,
        entityType: "StaffTableAssignment",
        entityId: input.staffId,
        action: "OWNER_BULK_ASSIGNED_TABLES",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: {
          staffId: input.staffId,
          staffName: target.name,
          tableIds: input.tableIds,
          tableNumbers: tables.map((t) => t.number),
          shiftDate: shiftDate.toISOString(),
        },
      },
    });
  });

  for (const table of tables) {
    await publishRealtimeEvent({
      event: REALTIME_EVENTS.TABLE_ASSIGNMENT_CHANGED,
      restaurantId: staff.restaurantId,
      payload: {
        tableId: table.id,
        tableNumber: table.number,
        staffId: input.staffId,
        staffName: target.name,
      },
    });
  }

  return {
    staffId: input.staffId,
    assignedCount: input.tableIds.length,
    shiftDate: shiftDate.toISOString(),
  };
}
