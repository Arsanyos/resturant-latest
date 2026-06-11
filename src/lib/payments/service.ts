import {
  KitchenStatus,
  PaymentMethod,
  PaymentStatus,
  SessionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { StaffSessionData } from "@/lib/auth/session";
import { computeTotals } from "@/lib/money";
import { publishRealtimeEvent } from "@/lib/realtime/publisher";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type {
  CashTransactionInput,
  MockTelebirrInput,
  VerifyTelebirrInput,
} from "@/lib/validation/payment";
import {
  loadPaymentWithContext,
  loadSessionBillContext,
} from "./queries";

export class PaymentError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

export function sessionAllItemsServed(
  orders: Array<{ items: Array<{ kitchenStatus: KitchenStatus }> }>
): boolean {
  const items = orders.flatMap((o) => o.items);
  if (items.length === 0) return false;
  return items.every(
    (item) =>
      item.kitchenStatus === KitchenStatus.SERVED ||
      item.kitchenStatus === KitchenStatus.CANCELLED
  );
}

export function sessionHasCashTransaction(
  transactions: Array<{ method: PaymentMethod }>
): boolean {
  return transactions.some((t) => t.method === PaymentMethod.CASH);
}

function derivePaymentStatus(
  totalPaid: number,
  totalDue: number,
  hasCash: boolean
): PaymentStatus {
  if (totalPaid <= 0) return PaymentStatus.UNPAID;
  if (totalPaid >= totalDue && !hasCash) return PaymentStatus.PAID;
  return PaymentStatus.PARTIALLY_PAID;
}

function serializeTransaction(txn: {
  id: string;
  amount: { toString(): string };
  method: PaymentMethod;
  status: string;
  telebirrRef: string | null;
  telebirrStatus: string | null;
  cashTendered: { toString(): string } | null;
  recordedByStaffId: string | null;
  createdAt: Date;
}) {
  return {
    id: txn.id,
    amount: Number(txn.amount),
    method: txn.method,
    status: txn.status,
    telebirrRef: txn.telebirrRef,
    telebirrStatus: txn.telebirrStatus,
    cashTendered: txn.cashTendered ? Number(txn.cashTendered) : null,
    recordedByStaffId: txn.recordedByStaffId,
    createdAt: txn.createdAt.toISOString(),
  };
}

function serializePayment(payment: {
  id: string;
  status: PaymentStatus;
  subtotal: { toString(): string };
  serviceCharge: { toString(): string };
  tax: { toString(): string };
  totalDue: { toString(): string };
  totalPaid: { toString(): string };
}) {
  const totalDue = Number(payment.totalDue);
  const totalPaid = Number(payment.totalPaid);
  return {
    id: payment.id,
    status: payment.status,
    subtotal: Number(payment.subtotal),
    serviceCharge: Number(payment.serviceCharge),
    tax: Number(payment.tax),
    totalDue,
    totalPaid,
    balance: Math.max(0, totalDue - totalPaid),
  };
}

export async function recalculateSessionPayment(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      table: { include: { restaurant: true } },
      orders: { include: { items: true } },
      payment: { include: { transactions: true } },
    },
  });

  if (!session) {
    throw new PaymentError("Session not found", 404);
  }

  const restaurant = session.table.restaurant;
  let subtotal = 0;

  for (const order of session.orders) {
    for (const item of order.items) {
      if (item.kitchenStatus === KitchenStatus.CANCELLED) continue;
      subtotal += Number(item.unitPrice) * item.quantity;
    }
  }

  const totals = computeTotals(
    subtotal,
    Number(restaurant.taxPct),
    Number(restaurant.servicePct)
  );

  const hasCash = session.payment
    ? sessionHasCashTransaction(session.payment.transactions)
    : false;
  const totalPaid = session.payment ? Number(session.payment.totalPaid) : 0;
  const status = derivePaymentStatus(totalPaid, totals.totalDue, hasCash);

  const payment = await prisma.payment.upsert({
    where: { sessionId },
    create: {
      sessionId,
      status: PaymentStatus.UNPAID,
      subtotal: totals.subtotal,
      serviceCharge: totals.serviceCharge,
      tax: totals.tax,
      totalDue: totals.totalDue,
      totalPaid: 0,
    },
    update: {
      subtotal: totals.subtotal,
      serviceCharge: totals.serviceCharge,
      tax: totals.tax,
      totalDue: totals.totalDue,
      status,
    },
  });

  return payment;
}

export async function getPaymentBySessionId(sessionId: string) {
  await recalculateSessionPayment(sessionId);
  const session = await loadSessionBillContext(sessionId);
  if (!session?.payment) {
    throw new PaymentError("Payment not found", 404);
  }
  return serializePayment(session.payment);
}

export async function buildSessionBill(sessionId: string) {
  await recalculateSessionPayment(sessionId);
  const session = await loadSessionBillContext(sessionId);

  if (!session) {
    throw new PaymentError("Session not found", 404);
  }

  const canPay = sessionAllItemsServed(session.orders);
  const payment = session.payment
    ? {
        ...serializePayment(session.payment),
        transactions: session.payment.transactions.map(serializeTransaction),
      }
    : null;

  return {
    session: {
      id: session.id,
      startedAt: session.startedAt.toISOString(),
      startedByType: session.startedByType,
      status: session.status,
    },
    table: {
      id: session.table.id,
      number: session.table.number,
      label: session.table.label,
    },
    restaurant: {
      id: session.table.restaurant.id,
      name: session.table.restaurant.name,
      currency: session.table.restaurant.currency,
    },
    canPay,
    orders: session.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        nameI18nKey: item.menuItem.nameI18nKey,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        kitchenStatus: item.kitchenStatus,
        modifiersJson: item.modifiersJson,
        notes: item.notes,
      })),
    })),
    payment,
  };
}

async function assertPaymentPayable(paymentId: string) {
  const payment = await loadPaymentWithContext(paymentId);
  if (!payment) {
    throw new PaymentError("Payment not found", 404);
  }
  if (payment.session.status !== SessionStatus.ACTIVE) {
    throw new PaymentError("Session is not active", 400);
  }
  if (!sessionAllItemsServed(payment.session.orders)) {
    throw new PaymentError(
      "Payment is locked until all kitchen items are served",
      400
    );
  }
  return payment;
}

export async function recordCashTransaction(
  input: CashTransactionInput,
  staff: StaffSessionData
) {
  const payment = await assertPaymentPayable(input.paymentId);
  const restaurant = payment.session.table.restaurant;

  if (restaurant.id !== staff.restaurantId) {
    throw new PaymentError("Forbidden", 403);
  }

  const balance = Number(payment.totalDue) - Number(payment.totalPaid);
  if (input.amount > balance + 0.01) {
    throw new PaymentError("Amount exceeds balance due", 400);
  }

  const newTotalPaid = Number(payment.totalPaid) + input.amount;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        amount: input.amount,
        method: PaymentMethod.CASH,
        status: "SUCCESS",
        cashTendered: input.cashTendered,
        recordedByStaffId: staff.staffId,
      },
    });

    const record = await tx.payment.update({
      where: { id: payment.id },
      data: {
        totalPaid: newTotalPaid,
        status: PaymentStatus.PARTIALLY_PAID,
      },
      include: { transactions: true },
    });

    await tx.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        entityType: "Payment",
        entityId: payment.id,
        action: "CASHIER_RECORDED_CASH",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: {
          amount: input.amount,
          cashTendered: input.cashTendered,
          totalPaid: newTotalPaid,
          tableNumber: payment.session.table.number,
        },
      },
    });

    return record;
  });

  await publishRealtimeEvent({
    event: REALTIME_EVENTS.PAYMENT_UPDATED,
    restaurantId: restaurant.id,
    payload: {
      paymentId: payment.id,
      sessionId: payment.sessionId,
      tableNumber: payment.session.table.number,
      status: updated.status,
      totalPaid: Number(updated.totalPaid),
    },
  });

  return {
    payment: serializePayment(updated),
    transactions: updated.transactions.map(serializeTransaction),
  };
}

export async function finalizePayment(
  paymentId: string,
  staff: StaffSessionData
) {
  const payment = await loadPaymentWithContext(paymentId);
  if (!payment) {
    throw new PaymentError("Payment not found", 404);
  }

  const restaurant = payment.session.table.restaurant;
  if (restaurant.id !== staff.restaurantId) {
    throw new PaymentError("Forbidden", 403);
  }

  if (payment.session.status !== SessionStatus.ACTIVE) {
    throw new PaymentError("Session is not active", 400);
  }

  const totalPaid = Number(payment.totalPaid);
  const totalDue = Number(payment.totalDue);
  if (totalPaid + 0.01 < totalDue) {
    throw new PaymentError("Payment is not fully covered", 400);
  }

  const tableNumber = payment.session.table.number;
  const sessionId = payment.sessionId;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.PAID },
    });

    await tx.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.CLOSED,
        endedAt: new Date(),
        closedByStaffId: staff.staffId,
      },
    });

    await tx.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        entityType: "Payment",
        entityId: paymentId,
        action: "CASHIER_FINALIZED_PAYMENT",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: {
          sessionId,
          tableNumber,
          totalDue,
          totalPaid,
        },
      },
    });
  });

  await publishRealtimeEvent({
    event: REALTIME_EVENTS.PAYMENT_COMPLETED,
    restaurantId: restaurant.id,
    payload: {
      paymentId,
      sessionId,
      tableNumber,
    },
  });

  await publishRealtimeEvent({
    event: REALTIME_EVENTS.SESSION_CLOSED,
    restaurantId: restaurant.id,
    payload: { sessionId, tableNumber },
  });

  return { paymentId, sessionId, status: PaymentStatus.PAID };
}

export async function processMockTelebirr(
  input: MockTelebirrInput,
  options?: { actorStaffId?: string; actorType?: string }
) {
  const payment = await assertPaymentPayable(input.paymentId);
  const restaurant = payment.session.table.restaurant;
  const balance = Number(payment.totalDue) - Number(payment.totalPaid);

  if (input.amount > balance + 0.01) {
    throw new PaymentError("Amount exceeds balance due", 400);
  }

  const shouldFail = input.simulateFailure;

  if (shouldFail) {
    const txn = await prisma.$transaction(async (tx) => {
      const record = await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          amount: input.amount,
          method: PaymentMethod.TELEBIRR,
          status: "FAILED",
          telebirrRef: input.billRefNumber,
          telebirrStatus: "PENDING_VERIFICATION",
        },
      });

      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          entityType: "PaymentTransaction",
          entityId: record.id,
          action: "CUSTOMER_TELEBIRR_MOCK",
          actorType: options?.actorType ?? "CUSTOMER",
          actorStaffId: options?.actorStaffId ?? null,
          payloadJson: {
            billRefNumber: input.billRefNumber,
            amount: input.amount,
            outcome: "PENDING_VERIFICATION",
            tableNumber: payment.session.table.number,
          },
        },
      });

      return record;
    });

    await publishRealtimeEvent({
      event: REALTIME_EVENTS.PAYMENT_UPDATED,
      restaurantId: restaurant.id,
      payload: {
        paymentId: payment.id,
        sessionId: payment.sessionId,
        tableNumber: payment.session.table.number,
        transactionId: txn.id,
        telebirrStatus: "PENDING_VERIFICATION",
      },
    });

    return {
      success: false,
      transaction: serializeTransaction(txn),
      message: "Telebirr verification pending",
    };
  }

  const newTotalPaid = Number(payment.totalPaid) + input.amount;
  const isFullPayment = newTotalPaid + 0.01 >= Number(payment.totalDue);

  const result = await prisma.$transaction(async (tx) => {
    const txn = await tx.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        amount: input.amount,
        method: PaymentMethod.TELEBIRR,
        status: "SUCCESS",
        telebirrRef: input.billRefNumber,
        telebirrStatus: "SUCCESS",
      },
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        totalPaid: newTotalPaid,
        status: isFullPayment ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID,
      },
    });

    if (isFullPayment) {
      await tx.session.update({
        where: { id: payment.sessionId },
        data: {
          status: SessionStatus.CLOSED,
          endedAt: new Date(),
          closedByStaffId: null,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        entityType: "PaymentTransaction",
        entityId: txn.id,
        action: "CUSTOMER_TELEBIRR_MOCK",
        actorType: options?.actorType ?? "CUSTOMER",
        actorStaffId: options?.actorStaffId ?? null,
        payloadJson: {
          billRefNumber: input.billRefNumber,
          amount: input.amount,
          outcome: "SUCCESS",
          sessionClosed: isFullPayment,
          tableNumber: payment.session.table.number,
        },
      },
    });

    return { txn, isFullPayment };
  });

  if (result.isFullPayment) {
    await publishRealtimeEvent({
      event: REALTIME_EVENTS.PAYMENT_COMPLETED,
      restaurantId: restaurant.id,
      payload: {
        paymentId: payment.id,
        sessionId: payment.sessionId,
        tableNumber: payment.session.table.number,
      },
    });
    await publishRealtimeEvent({
      event: REALTIME_EVENTS.SESSION_CLOSED,
      restaurantId: restaurant.id,
      payload: {
        sessionId: payment.sessionId,
        tableNumber: payment.session.table.number,
      },
    });
  } else {
    await publishRealtimeEvent({
      event: REALTIME_EVENTS.PAYMENT_UPDATED,
      restaurantId: restaurant.id,
      payload: {
        paymentId: payment.id,
        sessionId: payment.sessionId,
        tableNumber: payment.session.table.number,
        totalPaid: newTotalPaid,
      },
    });
  }

  return {
    success: true,
    sessionClosed: result.isFullPayment,
    transaction: serializeTransaction(result.txn),
  };
}

export async function verifyTelebirrTransaction(
  input: VerifyTelebirrInput,
  staff: StaffSessionData
) {
  const txn = await prisma.paymentTransaction.findUnique({
    where: { id: input.transactionId },
    include: {
      payment: {
        include: {
          session: {
            include: {
              table: { include: { restaurant: true } },
              orders: { include: { items: true } },
            },
          },
          transactions: true,
        },
      },
    },
  });

  if (!txn || txn.method !== PaymentMethod.TELEBIRR) {
    throw new PaymentError("Transaction not found", 404);
  }

  const restaurant = txn.payment.session.table.restaurant;
  if (restaurant.id !== staff.restaurantId) {
    throw new PaymentError("Forbidden", 403);
  }

  if (!input.verified) {
    await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { id: txn.id },
        data: { status: "FAILED", telebirrStatus: "FAILED" },
      });
      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          entityType: "PaymentTransaction",
          entityId: txn.id,
          action: "CASHIER_REJECTED_TELEBIRR",
          actorType: "STAFF",
          actorStaffId: staff.staffId,
          payloadJson: { telebirrRef: txn.telebirrRef },
        },
      });
    });

    await publishRealtimeEvent({
      event: REALTIME_EVENTS.PAYMENT_UPDATED,
      restaurantId: restaurant.id,
      payload: {
        transactionId: txn.id,
        telebirrStatus: "FAILED",
      },
    });

    return { verified: false, transactionId: txn.id };
  }

  const payment = txn.payment;
  const hasCash = sessionHasCashTransaction(
    payment.transactions.filter((t) => t.id !== txn.id)
  );
  const newTotalPaid =
    Number(payment.totalPaid) +
    (txn.status === "SUCCESS" ? 0 : Number(txn.amount));
  const isFullPayment = newTotalPaid + 0.01 >= Number(payment.totalDue);
  const shouldClose = isFullPayment && !hasCash;

  await prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.update({
      where: { id: txn.id },
      data: { status: "SUCCESS", telebirrStatus: "SUCCESS" },
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        totalPaid: newTotalPaid,
        status: shouldClose
          ? PaymentStatus.PAID
          : PaymentStatus.PARTIALLY_PAID,
      },
    });

    if (shouldClose) {
      await tx.session.update({
        where: { id: payment.sessionId },
        data: {
          status: SessionStatus.CLOSED,
          endedAt: new Date(),
          closedByStaffId: staff.staffId,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        entityType: "PaymentTransaction",
        entityId: txn.id,
        action: "CASHIER_VERIFIED_TELEBIRR",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: {
          amount: Number(txn.amount),
          sessionClosed: shouldClose,
        },
      },
    });
  });

  if (shouldClose) {
    await publishRealtimeEvent({
      event: REALTIME_EVENTS.PAYMENT_COMPLETED,
      restaurantId: restaurant.id,
      payload: {
        paymentId: payment.id,
        sessionId: payment.sessionId,
      },
    });
    await publishRealtimeEvent({
      event: REALTIME_EVENTS.SESSION_CLOSED,
      restaurantId: restaurant.id,
      payload: { sessionId: payment.sessionId },
    });
  } else {
    await publishRealtimeEvent({
      event: REALTIME_EVENTS.PAYMENT_UPDATED,
      restaurantId: restaurant.id,
      payload: { paymentId: payment.id, totalPaid: newTotalPaid },
    });
  }

  return { verified: true, transactionId: txn.id, sessionClosed: shouldClose };
}
