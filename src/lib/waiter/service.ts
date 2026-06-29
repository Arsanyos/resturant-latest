import {
  AssistanceStatus,
  KitchenStatus,
  StaffRole,
  StartedByType,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { StaffSessionData } from "@/lib/auth/session";
import { resolveRestaurantBySlug } from "@/lib/restaurants/service";
import { getMenuForBootstrap } from "@/lib/restaurants/queries";
import { publishRealtimeEvent } from "@/lib/realtime/publisher";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type {
  AssistanceUpdateInput,
  StaffAssignmentInput,
} from "@/lib/validation/waiter";
import { ensureTableAssignment } from "./assignments";
import { getShiftDate } from "./shift";
import {
  getActiveSessionsByRestaurant,
  getActiveTables,
  getAssistanceRequestsForRestaurant,
  getPendingAssistanceCounts,
  getTableByIdInRestaurant,
  getTodayAssignments,
  isStaffAssignedToTable,
  sessionHasAwaitingPayment,
} from "./queries";

export type WaiterTableStatus =
  | "idle"
  | "active"
  | "awaiting_payment"
  | "assistance_requested";

export class WaiterError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "WaiterError";
  }
}

export function canStaffMutateTable(
  staff: StaffSessionData,
  tableId: string,
  assignedStaffIds: string[]
): boolean {
  if (staff.role === StaffRole.OWNER) return true;
  return assignedStaffIds.includes(staff.staffId);
}

export async function assertStaffCanMutateTable(
  staff: StaffSessionData,
  tableId: string
) {
  if (staff.role === StaffRole.OWNER) return;

  const assigned = await isStaffAssignedToTable(staff.staffId, tableId);
  if (!assigned) {
    throw new WaiterError("Table not assigned to you", 403);
  }
}

function deriveTableStatus(
  hasSession: boolean,
  pendingAssistance: number,
  items: { kitchenStatus: KitchenStatus }[],
  paymentStatus: string | undefined
): WaiterTableStatus {
  if (pendingAssistance > 0) return "assistance_requested";
  if (!hasSession) return "idle";
  if (sessionHasAwaitingPayment(items, paymentStatus)) {
    return "awaiting_payment";
  }
  return "active";
}

export async function getWaiterTables(slug: string, staff: StaffSessionData) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) {
    throw new WaiterError("Restaurant not found", 404);
  }
  if (restaurant.id !== staff.restaurantId) {
    throw new WaiterError("Forbidden", 403);
  }

  const [tables, assignments, sessions, assistanceCounts] = await Promise.all([
    getActiveTables(restaurant.id),
    getTodayAssignments(restaurant.id),
    getActiveSessionsByRestaurant(restaurant.id),
    getPendingAssistanceCounts(restaurant.id),
  ]);

  const assignmentsByTable = new Map<
    string,
    Array<{ id: string; name: string }>
  >();
  for (const a of assignments) {
    const list = assignmentsByTable.get(a.tableId) ?? [];
    list.push({ id: a.staff.id, name: a.staff.name });
    assignmentsByTable.set(a.tableId, list);
  }

  const sessionByTable = new Map(sessions.map((s) => [s.tableId, s]));

  return {
    tables: tables.map((table) => {
      const assigned = assignmentsByTable.get(table.id) ?? [];
      const session = sessionByTable.get(table.id);
      const allItems = session?.orders.flatMap((o) => o.items) ?? [];
      const pendingAssistance = assistanceCounts.get(table.id) ?? 0;
      const canMutate = canStaffMutateTable(
        staff,
        table.id,
        assigned.map((w) => w.id)
      );

      return {
        id: table.id,
        number: table.number,
        label: table.label,
        capacity: table.capacity,
        status: deriveTableStatus(
          !!session,
          pendingAssistance,
          allItems,
          session?.payment?.status
        ),
        assignedWaiters: assigned,
        isAssignedToMe: assigned.some((w) => w.id === staff.staffId),
        canMutate,
        pendingAssistanceCount: pendingAssistance,
        session: session
          ? {
              id: session.id,
              startedByType: session.startedByType,
              startedAt: session.startedAt.toISOString(),
              orderCount: session.orders.length,
              itemCount: allItems.length,
              paymentStatus: session.payment?.status ?? null,
            }
          : null,
      };
    }),
  };
}

export async function getWaiterMenu(slug: string, staff: StaffSessionData) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) {
    throw new WaiterError("Restaurant not found", 404);
  }
  if (restaurant.id !== staff.restaurantId) {
    throw new WaiterError("Forbidden", 403);
  }

  const menu = await getMenuForBootstrap(restaurant.id);
  return {
    menu,
    currency: restaurant.currency,
    isOpen: true,
  };
}

export async function assignTable(
  staff: StaffSessionData,
  input: StaffAssignmentInput
) {
  const table = await prisma.table.findUnique({
    where: { id: input.tableId },
    include: { restaurant: true },
  });

  if (!table || table.restaurantId !== staff.restaurantId) {
    throw new WaiterError("Table not found", 404);
  }

  let targetStaffId = staff.staffId;
  let action = "WAITER_SELF_ASSIGNED_TABLE";

  if (input.staffId) {
    if (staff.role !== StaffRole.OWNER) {
      throw new WaiterError("Only owner can assign other staff", 403);
    }
    const target = await prisma.staff.findFirst({
      where: {
        id: input.staffId,
        restaurantId: staff.restaurantId,
        isActive: true,
      },
    });
    if (!target) {
      throw new WaiterError("Staff not found", 404);
    }
    targetStaffId = target.id;
    action = "OWNER_ASSIGNED_TABLE";
  }

  const assignment = await ensureTableAssignment(
    targetStaffId,
    input.tableId,
    {
      assignedById: input.staffId ? staff.staffId : null,
      restaurantId: staff.restaurantId,
      actorStaffId: staff.staffId,
      auditAction: action,
    }
  );

  return {
    id: assignment.id,
    tableId: assignment.tableId,
    staffId: assignment.staffId,
    staffName: assignment.staff.name,
    tableNumber: assignment.table.number,
  };
}

export async function getWaiterAssistance(
  slug: string,
  staff: StaffSessionData
) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) {
    throw new WaiterError("Restaurant not found", 404);
  }
  if (restaurant.id !== staff.restaurantId) {
    throw new WaiterError("Forbidden", 403);
  }

  const requests = await getAssistanceRequestsForRestaurant(restaurant.id);
  const tableIds = [...new Set(requests.map((r) => r.tableId))];
  const tables = await prisma.table.findMany({
    where: { id: { in: tableIds } },
    select: { id: true, number: true, label: true },
  });
  const tableMap = new Map(tables.map((t) => [t.id, t]));

  return {
    requests: requests.map((req) => {
      const table = tableMap.get(req.tableId);
      return {
        id: req.id,
        tableId: req.tableId,
        tableNumber: table?.number ?? 0,
        tableLabel: table?.label ?? "",
        sessionId: req.sessionId,
        deviceInfo: req.deviceInfo,
        status: req.status,
        createdAt: req.createdAt.toISOString(),
      };
    }),
  };
}

export async function updateAssistanceRequest(
  requestId: string,
  input: AssistanceUpdateInput,
  staff: StaffSessionData
) {
  const request = await prisma.waiterAssistanceRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new WaiterError("Assistance request not found", 404);
  }

  const table = await getTableByIdInRestaurant(
    request.tableId,
    staff.restaurantId
  );
  if (!table) {
    throw new WaiterError("Forbidden", 403);
  }

  const from = request.status;
  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.waiterAssistanceRequest.update({
      where: { id: requestId },
      data: {
        status: input.status,
        acknowledgedByStaffId: staff.staffId,
      },
    });

    await tx.auditLog.create({
      data: {
        restaurantId: staff.restaurantId,
        entityType: "WaiterAssistanceRequest",
        entityId: requestId,
        action:
          input.status === AssistanceStatus.ACKNOWLEDGED
            ? "ASSISTANCE_ACKNOWLEDGED"
            : "ASSISTANCE_RESOLVED",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: { from, to: input.status, tableNumber: table.number },
      },
    });

    return record;
  });

  if (
    input.status === AssistanceStatus.ACKNOWLEDGED &&
    staff.role === StaffRole.WAITER
  ) {
    await ensureTableAssignment(staff.staffId, request.tableId, {
      restaurantId: staff.restaurantId,
      actorStaffId: staff.staffId,
      auditAction: "WAITER_ASSIGNED_ON_ASSISTANCE_ACK",
    });
  }

  await publishRealtimeEvent({
    event: REALTIME_EVENTS.ASSISTANCE_UPDATED,
    restaurantId: staff.restaurantId,
    payload: {
      requestId,
      tableId: request.tableId,
      tableNumber: table.number,
      status: input.status,
    },
  });

  return {
    id: updated.id,
    status: updated.status,
  };
}

export async function getWaiterTableDetail(
  slug: string,
  tableId: string,
  staff: StaffSessionData
) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) {
    throw new WaiterError("Restaurant not found", 404);
  }

  const table = await getTableByIdInRestaurant(tableId, restaurant.id);
  if (!table) {
    throw new WaiterError("Table not found", 404);
  }

  const shiftDate = getShiftDate();
  const assignments = await prisma.staffTableAssignment.findMany({
    where: { tableId, shiftDate },
    include: { staff: { select: { id: true, name: true } } },
  });

  const assignedWaiters = assignments.map((a) => ({
    id: a.staff.id,
    name: a.staff.name,
  }));

  const canMutate = canStaffMutateTable(
    staff,
    tableId,
    assignedWaiters.map((w) => w.id)
  );

  const session = await prisma.session.findFirst({
    where: { tableId, status: "ACTIVE" },
    include: {
      orders: {
        orderBy: { orderNumber: "asc" },
        include: {
          items: {
            include: { menuItem: { select: { name: true } } },
          },
        },
      },
      payment: true,
    },
  });

  return {
    table: {
      id: table.id,
      number: table.number,
      label: table.label,
      capacity: table.capacity,
    },
    assignedWaiters,
    isAssignedToMe: assignedWaiters.some((w) => w.id === staff.staffId),
    canMutate,
    session: session
      ? {
          id: session.id,
          startedByType: session.startedByType,
          startedAt: session.startedAt.toISOString(),
          orders: session.orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            createdAt: order.createdAt.toISOString(),
            takenByStaffId: order.takenByStaffId,
            items: order.items.map((item) => ({
              id: item.id,
              menuItemId: item.menuItemId,
              name: item.menuItem.name,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
              kitchenStatus: item.kitchenStatus,
              modifiersJson: item.modifiersJson,
              notes: item.notes,
              cancelReason: item.cancelReason,
            })),
          })),
          payment: session.payment
            ? {
                subtotal: Number(session.payment.subtotal),
                serviceCharge: Number(session.payment.serviceCharge),
                tax: Number(session.payment.tax),
                totalDue: Number(session.payment.totalDue),
                totalPaid: Number(session.payment.totalPaid),
                status: session.payment.status,
              }
            : null,
        }
      : null,
  };
}
