import { PaymentStatus } from "@prisma/client";
import { resolveRestaurantBySlug } from "@/lib/restaurants/service";
import {
  buildSessionBill,
  sessionAllItemsServed,
} from "@/lib/payments/service";
import type { StaffSessionData } from "@/lib/auth/session";
import {
  loadActiveSessionsForRestaurant,
  loadPendingTelebirrTransactions,
} from "@/lib/payments/queries";

export type CashierSessionChip =
  | "in_kitchen"
  | "ready_to_pay"
  | "partially_paid"
  | "verification_pending";

export class CashierError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "CashierError";
  }
}

function deriveSessionChip(
  orders: Array<{ items: Array<{ kitchenStatus: string }> }>,
  payment: {
    status: PaymentStatus;
    transactions: Array<{ method: string; telebirrStatus: string | null }>;
  } | null
): CashierSessionChip {
  const hasVerificationPending = payment?.transactions.some(
    (t) =>
      t.method === "TELEBIRR" &&
      (t.telebirrStatus === "PENDING_VERIFICATION" ||
        t.telebirrStatus === "FAILED")
  );

  if (hasVerificationPending) return "verification_pending";
  if (payment?.status === PaymentStatus.PARTIALLY_PAID) return "partially_paid";
  if (sessionAllItemsServed(orders as Parameters<typeof sessionAllItemsServed>[0])) {
    return "ready_to_pay";
  }
  return "in_kitchen";
}

export async function getCashierSessions(slug: string, staff: StaffSessionData) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) {
    throw new CashierError("Restaurant not found", 404);
  }
  if (restaurant.id !== staff.restaurantId) {
    throw new CashierError("Forbidden", 403);
  }

  const sessions = await loadActiveSessionsForRestaurant(restaurant.id);

  return {
    sessions: sessions.map((session) => {
      const payment = session.payment;
      const totalDue = payment ? Number(payment.totalDue) : 0;
      const totalPaid = payment ? Number(payment.totalPaid) : 0;

      return {
        sessionId: session.id,
        tableId: session.table.id,
        tableNumber: session.table.number,
        tableLabel: session.table.label,
        startedAt: session.startedAt.toISOString(),
        startedByType: session.startedByType,
        orderCount: session.orders.length,
        chip: deriveSessionChip(session.orders, payment),
        paymentStatus: payment?.status ?? PaymentStatus.UNPAID,
        totalDue,
        totalPaid,
        balance: Math.max(0, totalDue - totalPaid),
        paymentId: payment?.id ?? null,
      };
    }),
  };
}

export async function getCashierSessionBill(
  slug: string,
  sessionId: string,
  staff: StaffSessionData
) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) {
    throw new CashierError("Restaurant not found", 404);
  }
  if (restaurant.id !== staff.restaurantId) {
    throw new CashierError("Forbidden", 403);
  }

  const bill = await buildSessionBill(sessionId);
  if (bill.restaurant.id !== restaurant.id) {
    throw new CashierError("Forbidden", 403);
  }

  return bill;
}

export async function getVerificationQueue(
  slug: string,
  staff: StaffSessionData
) {
  const restaurant = await resolveRestaurantBySlug(slug);
  if (!restaurant) {
    throw new CashierError("Restaurant not found", 404);
  }
  if (restaurant.id !== staff.restaurantId) {
    throw new CashierError("Forbidden", 403);
  }

  const transactions = await loadPendingTelebirrTransactions(restaurant.id);

  return {
    items: transactions.map((txn) => ({
      transactionId: txn.id,
      paymentId: txn.paymentId,
      sessionId: txn.payment.sessionId,
      tableNumber: txn.payment.session.table.number,
      tableLabel: txn.payment.session.table.label,
      amount: Number(txn.amount),
      telebirrRef: txn.telebirrRef,
      telebirrStatus: txn.telebirrStatus,
      createdAt: txn.createdAt.toISOString(),
    })),
  };
}
