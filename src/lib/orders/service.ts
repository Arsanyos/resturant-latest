import {
  AssistanceStatus,
  KitchenStatus,
  SessionStatus,
  StartedByType,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { StaffSessionData } from "@/lib/auth/session";
import { computeIsOpen } from "@/lib/restaurants/service";
import { recalculateSessionPayment } from "@/lib/payments/service";
import { publishRealtimeEvent } from "@/lib/realtime/publisher";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { assertStaffCanMutateTable } from "@/lib/waiter/service";
import type { PlaceOrderInput } from "@/lib/validation/order";
import type {
  CancelOrderItemInput,
  ReorderItemInput,
} from "@/lib/validation/waiter";
import { getNextOrderNumber } from "./queries";

export class OrderError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "OrderError";
  }
}

async function loadSessionForOrder(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      table: { include: { restaurant: true } },
    },
  });
}

async function assertSessionAccess(
  session: NonNullable<Awaited<ReturnType<typeof loadSessionForOrder>>>,
  _deviceToken?: string,
  staff?: StaffSessionData
) {
  if (session.status !== SessionStatus.ACTIVE) {
    throw new OrderError("Session is not active", 400);
  }

  if (staff) {
    if (staff.restaurantId !== session.table.restaurant.id) {
      throw new OrderError("Forbidden", 403);
    }
    await assertStaffCanMutateTable(staff, session.tableId);
  }
}

export async function placeOrder(
  sessionId: string,
  input: PlaceOrderInput,
  options?: { deviceToken?: string; staff?: StaffSessionData }
) {
  const session = await loadSessionForOrder(sessionId);

  if (!session) {
    throw new OrderError("Session not found", 404);
  }

  await assertSessionAccess(
    session,
    options?.deviceToken,
    options?.staff
  );

  const restaurant = session.table.restaurant;

  if (!computeIsOpen(restaurant)) {
    throw new OrderError("Restaurant is closed", 403);
  }

  const menuItemIds = input.items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      manualAvailable: true,
      derivedAvailable: true,
      category: { restaurantId: restaurant.id },
    },
    include: { variants: true, modifiers: true },
  });

  if (menuItems.length !== new Set(menuItemIds).size) {
    throw new OrderError("One or more items are unavailable", 400);
  }

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));
  const orderNumber = await getNextOrderNumber(sessionId);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        sessionId,
        orderNumber,
        takenByStaffId: options?.staff?.staffId ?? null,
      },
    });

    for (const line of input.items) {
      const menuItem = menuItemMap.get(line.menuItemId)!;
      let unitPrice = Number(menuItem.basePrice);

      if (line.variantId) {
        const variant = menuItem.variants.find((v) => v.id === line.variantId);
        if (!variant) {
          throw new OrderError("Invalid variant", 400);
        }
        unitPrice += Number(variant.priceDelta);
      }

      for (const mod of line.modifiers) {
        const modifier = menuItem.modifiers.find(
          (m) => m.id === mod.modifierId
        );
        if (!modifier) {
          throw new OrderError("Invalid modifier", 400);
        }
        unitPrice += Number(modifier.priceDelta);
      }

      await tx.orderItem.create({
        data: {
          orderId: created.id,
          menuItemId: line.menuItemId,
          variantId: line.variantId ?? null,
          quantity: line.quantity,
          unitPrice,
          modifiersJson: line.modifiers,
          notes: line.notes ?? null,
          kitchenStatus: KitchenStatus.PENDING,
        },
      });
    }

    if (options?.staff) {
      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          entityType: "Order",
          entityId: created.id,
          action: "WAITER_PLACED_ORDER",
          actorType: "STAFF",
          actorStaffId: options.staff.staffId,
          payloadJson: {
            sessionId,
            orderNumber,
            tableNumber: session.table.number,
            itemCount: input.items.length,
          },
        },
      });
    }

    return created;
  });

  await recalculateSessionPayment(sessionId);

  const fullOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: {
        include: { menuItem: { select: { name: true } } },
      },
    },
  });

  await publishRealtimeEvent({
    event: REALTIME_EVENTS.ORDER_PLACED,
    restaurantId: restaurant.id,
    payload: {
      sessionId,
      orderId: order.id,
      tableNumber: session.table.number,
      orderNumber,
    },
  });

  return fullOrder!;
}

export async function listSessionOrders(
  sessionId: string,
  options?: { deviceToken?: string; staff?: StaffSessionData }
) {
  const session = await loadSessionForOrder(sessionId);

  if (!session) {
    throw new OrderError("Session not found", 404);
  }

  await assertSessionAccess(
    session,
    options?.deviceToken,
    options?.staff
  );

  await recalculateSessionPayment(sessionId);

  const [orders, payment] = await Promise.all([
    prisma.order.findMany({
      where: { sessionId },
      orderBy: { orderNumber: "asc" },
      include: {
        items: {
          include: { menuItem: { select: { name: true } } },
        },
      },
    }),
    prisma.payment.findUnique({ where: { sessionId } }),
  ]);

  return {
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItem.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        kitchenStatus: item.kitchenStatus,
        modifiersJson: item.modifiersJson,
        notes: item.notes,
      })),
    })),
    payment: payment
      ? {
          id: payment.id,
          subtotal: Number(payment.subtotal),
          serviceCharge: Number(payment.serviceCharge),
          tax: Number(payment.tax),
          totalDue: Number(payment.totalDue),
          totalPaid: Number(payment.totalPaid),
          balance: Math.max(
            0,
            Number(payment.totalDue) - Number(payment.totalPaid)
          ),
          status: payment.status,
        }
      : null,
  };
}

export async function createAssistanceRequest(
  sessionId: string,
  deviceInfo?: string,
  tableId?: string
) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { table: { include: { restaurant: true } } },
  });

  const resolvedTableId = tableId ?? session?.tableId;

  if (!resolvedTableId) {
    throw new OrderError("Table not found", 404);
  }

  const table = await prisma.table.findUnique({
    where: { id: resolvedTableId },
    include: { restaurant: true },
  });

  if (!table) {
    throw new OrderError("Table not found", 404);
  }

  const request = await prisma.waiterAssistanceRequest.create({
    data: {
      sessionId: session?.id ?? null,
      tableId: resolvedTableId,
      deviceInfo: deviceInfo ?? null,
    },
  });

  await publishRealtimeEvent({
    event: REALTIME_EVENTS.ASSISTANCE_CREATED,
    restaurantId: table.restaurantId,
    payload: {
      requestId: request.id,
      tableId: resolvedTableId,
      tableNumber: table.number,
      sessionId: session?.id ?? null,
    },
  });

  return request;
}

export async function getSessionAssistanceStatus(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, tableId: true },
  });

  if (!session) {
    throw new OrderError("Session not found", 404);
  }

  const request = await prisma.waiterAssistanceRequest.findFirst({
    where: {
      tableId: session.tableId,
      status: {
        in: [AssistanceStatus.PENDING, AssistanceStatus.ACKNOWLEDGED],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!request) {
    return { request: null };
  }

  let waiterName: string | null = null;
  if (request.acknowledgedByStaffId) {
    const staff = await prisma.staff.findUnique({
      where: { id: request.acknowledgedByStaffId },
      select: { name: true },
    });
    waiterName = staff?.name ?? null;
  }

  return {
    request: {
      id: request.id,
      status: request.status,
      waiterName,
      createdAt: request.createdAt.toISOString(),
    },
  };
}

const CANCELLABLE_STATUSES: KitchenStatus[] = [
  KitchenStatus.PENDING,
  KitchenStatus.BEING_PREPARED,
  KitchenStatus.SERVED,
];

export async function cancelOrderItem(
  orderItemId: string,
  input: CancelOrderItemInput,
  staff: StaffSessionData
) {
  const item = await prisma.orderItem.findUnique({
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

  if (!item) {
    throw new OrderError("Order item not found", 404);
  }

  const restaurant = item.order.session.table.restaurant;
  if (restaurant.id !== staff.restaurantId) {
    throw new OrderError("Forbidden", 403);
  }

  await assertStaffCanMutateTable(staff, item.order.session.tableId);

  if (item.kitchenStatus === KitchenStatus.CANCELLED) {
    throw new OrderError("Item already cancelled", 400);
  }

  if (!CANCELLABLE_STATUSES.includes(item.kitchenStatus)) {
    throw new OrderError("Item cannot be cancelled", 400);
  }

  const from = item.kitchenStatus;
  const tableNumber = item.order.session.table.number;

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.update({
      where: { id: orderItemId },
      data: {
        kitchenStatus: KitchenStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledByStaffId: staff.staffId,
        cancelReason: input.reason,
      },
    });

    await tx.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        entityType: "OrderItem",
        entityId: orderItemId,
        action: "WAITER_CANCELLED_ORDER_ITEM",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: {
          from,
          reason: input.reason,
          tableNumber,
          orderNumber: item.order.orderNumber,
          name: item.menuItem.name,
        },
      },
    });
  });

  await recalculateSessionPayment(item.order.sessionId);

  await publishRealtimeEvent({
    event: REALTIME_EVENTS.ORDER_ITEM_CANCELLED,
    restaurantId: restaurant.id,
    payload: {
      orderItemId,
      orderId: item.orderId,
      sessionId: item.order.sessionId,
      tableNumber,
    },
  });

  return { orderItemId, kitchenStatus: KitchenStatus.CANCELLED };
}

export async function reorderOrderItem(
  sessionId: string,
  input: ReorderItemInput,
  staff: StaffSessionData
) {
  const session = await loadSessionForOrder(sessionId);
  if (!session) {
    throw new OrderError("Session not found", 404);
  }

  await assertSessionAccess(session, undefined, staff);

  const source = await prisma.orderItem.findUnique({
    where: { id: input.sourceOrderItemId },
    include: {
      menuItem: { select: { name: true } },
      order: true,
    },
  });

  if (!source || source.order.sessionId !== sessionId) {
    throw new OrderError("Source item not found", 404);
  }

  if (source.kitchenStatus !== KitchenStatus.SERVED) {
    throw new OrderError("Only served items can be reordered", 400);
  }

  const orderNumber = await getNextOrderNumber(sessionId);
  const restaurant = session.table.restaurant;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        sessionId,
        orderNumber,
        takenByStaffId: staff.staffId,
      },
    });

    await tx.orderItem.create({
      data: {
        orderId: created.id,
        menuItemId: source.menuItemId,
        variantId: source.variantId,
        quantity: source.quantity,
        unitPrice: source.unitPrice,
        modifiersJson: source.modifiersJson ?? [],
        notes: source.notes,
        kitchenStatus: KitchenStatus.PENDING,
      },
    });

    await tx.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        entityType: "OrderItem",
        entityId: source.id,
        action: "WAITER_REORDERED_ITEM",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: {
          sourceOrderItemId: source.id,
          newOrderId: created.id,
          reason: input.reason,
          tableNumber: session.table.number,
          name: source.menuItem.name,
        },
      },
    });

    return created;
  });

  await recalculateSessionPayment(sessionId);

  const fullOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: {
        include: { menuItem: { select: { name: true } } },
      },
    },
  });

  await publishRealtimeEvent({
    event: REALTIME_EVENTS.ORDER_PLACED,
    restaurantId: restaurant.id,
    payload: {
      sessionId,
      orderId: order.id,
      tableNumber: session.table.number,
      orderNumber,
    },
  });

  return fullOrder!;
}
