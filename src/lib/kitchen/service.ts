import { KitchenStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveRestaurantBySlug } from "@/lib/restaurants/service";
import { publishRealtimeEvent } from "@/lib/realtime/publisher";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type { StaffSessionData } from "@/lib/auth/session";
import {
  getActiveSessionsWithOrders,
  getKitchenAuditLogs,
  getOrderItemWithContext,
} from "./queries";

export type KitchenWindow = "all" | "10" | "30" | "60";

export class KitchenError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "KitchenError";
  }
}

const ALLOWED_TRANSITIONS: Record<KitchenStatus, KitchenStatus[]> = {
  PENDING: [KitchenStatus.BEING_PREPARED],
  BEING_PREPARED: [KitchenStatus.SERVED],
  SERVED: [],
  CANCELLED: [],
};

function windowCutoff(window: KitchenWindow): Date | null {
  if (window === "all") return null;
  const minutes = Number(window);
  return new Date(Date.now() - minutes * 60 * 1000);
}

type ModifierJson = {
  modifierId?: string;
  nameI18nKey: string;
  priceDelta?: number;
};

async function resolveVariantNameI18nKey(
  variantId: string | null
): Promise<string | null> {
  if (!variantId) return null;
  const variant = await prisma.menuItemVariant.findUnique({
    where: { id: variantId },
    select: { nameI18nKey: true },
  });
  return variant?.nameI18nKey ?? null;
}

export async function getKitchenOrders(slug: string, window: KitchenWindow) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) {
    throw new KitchenError("Restaurant not found", 404);
  }

  const sessions = await getActiveSessionsWithOrders(restaurant.id);
  const cutoff = windowCutoff(window);

  const tables = await Promise.all(
    sessions.map(async (session) => {
      const orders = await Promise.all(
        session.orders
          .filter((order) => !cutoff || order.createdAt >= cutoff)
          .map(async (order) => ({
            orderId: order.id,
            orderNumber: order.orderNumber,
            createdAt: order.createdAt.toISOString(),
            items: await Promise.all(
              order.items.map(async (item) => {
                const modifiers = Array.isArray(item.modifiersJson)
                  ? (item.modifiersJson as ModifierJson[])
                  : [];

                return {
                  orderItemId: item.id,
                  name: item.menuItem.name,
                  quantity: item.quantity,
                  variantNameI18nKey: await resolveVariantNameI18nKey(
                    item.variantId
                  ),
                  modifiers: modifiers.map((m) => ({
                    nameI18nKey: m.nameI18nKey,
                    priceDelta: m.priceDelta ?? 0,
                  })),
                  notes: item.notes,
                  kitchenStatus: item.kitchenStatus,
                  cancelReason: item.cancelReason,
                };
              })
            ),
          }))
      );

      return {
        tableId: session.table.id,
        tableNumber: session.table.number,
        tableLabel: session.table.label,
        sessionId: session.id,
        orders,
      };
    })
  );

  return {
    tables: tables.filter((t) => t.orders.length > 0),
  };
}

export async function updateOrderItemStatus(
  orderItemId: string,
  nextStatus: KitchenStatus,
  staff: StaffSessionData
) {
  const item = await getOrderItemWithContext(orderItemId);

  if (!item) {
    throw new KitchenError("Order item not found", 404);
  }

  const restaurant = item.order.session.table.restaurant;

  if (restaurant.id !== staff.restaurantId) {
    throw new KitchenError("Forbidden", 403);
  }

  if (item.kitchenStatus === KitchenStatus.CANCELLED) {
    throw new KitchenError("Cancelled items cannot be updated", 400);
  }

  const allowed = ALLOWED_TRANSITIONS[item.kitchenStatus];
  if (!allowed.includes(nextStatus)) {
    throw new KitchenError("Invalid status transition", 400);
  }

  const from = item.kitchenStatus;
  const tableNumber = item.order.session.table.number;
  const orderNumber = item.order.orderNumber;

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.orderItem.update({
      where: { id: orderItemId },
      data: { kitchenStatus: nextStatus },
      include: { menuItem: { select: { name: true } } },
    });

    await tx.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        entityType: "OrderItem",
        entityId: orderItemId,
        action: "ORDER_ITEM_STATUS_CHANGED",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: {
          from,
          to: nextStatus,
          tableNumber,
          orderNumber,
          name: item.menuItem.name,
        },
      },
    });

    return record;
  });

  await publishRealtimeEvent({
    event: REALTIME_EVENTS.ORDER_ITEM_STATUS_CHANGED,
    restaurantId: restaurant.id,
    payload: {
      orderItemId,
      orderId: item.orderId,
      sessionId: item.order.sessionId,
      tableNumber,
      from,
      to: nextStatus,
    },
  });

  return {
    orderItemId: updated.id,
    kitchenStatus: updated.kitchenStatus,
    name: updated.menuItem.name,
  };
}

export async function getKitchenActivity(slug: string) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) {
    throw new KitchenError("Restaurant not found", 404);
  }

  const logs = await getKitchenAuditLogs(restaurant.id);

  return {
    entries: logs.map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      payload: log.payloadJson as Record<string, unknown>,
    })),
  };
}
