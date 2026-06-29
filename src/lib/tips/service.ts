import {
  AssistanceStatus,
  PaymentStatus,
  StaffRole,
  TipStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { publishRealtimeEvent } from "@/lib/realtime/publisher";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getShiftDate } from "@/lib/waiter/shift";
import type { MockTipTelebirrInput } from "@/lib/validation/tip";

export class TipError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "TipError";
  }
}

async function activeWaiterId(staffId: string | null | undefined) {
  if (!staffId) {
    return null;
  }

  const waiter = await prisma.staff.findFirst({
    where: {
      id: staffId,
      role: StaffRole.WAITER,
      isActive: true,
    },
    select: { id: true },
  });

  return waiter?.id ?? null;
}

export async function resolveTipRecipient(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      tableId: true,
      startedByStaffId: true,
      startedAt: true,
    },
  });

  if (!session) {
    return null;
  }

  const shiftDate = getShiftDate();
  const assignment = await prisma.staffTableAssignment.findFirst({
    where: {
      tableId: session.tableId,
      shiftDate,
      staff: { role: StaffRole.WAITER, isActive: true },
    },
    orderBy: { createdAt: "asc" },
    select: { staffId: true },
  });

  const fromAssignment = await activeWaiterId(assignment?.staffId);
  if (fromAssignment) {
    return fromAssignment;
  }

  const assistance = await prisma.waiterAssistanceRequest.findFirst({
    where: {
      OR: [
        { sessionId },
        {
          tableId: session.tableId,
          createdAt: { gte: session.startedAt },
        },
      ],
      acknowledgedByStaffId: { not: null },
      status: {
        in: [AssistanceStatus.ACKNOWLEDGED, AssistanceStatus.RESOLVED],
      },
    },
    orderBy: { createdAt: "desc" },
    select: { acknowledgedByStaffId: true },
  });

  const fromAssistance = await activeWaiterId(
    assistance?.acknowledgedByStaffId
  );
  if (fromAssistance) {
    return fromAssistance;
  }

  const order = await prisma.order.findFirst({
    where: {
      sessionId,
      takenByStaffId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: { takenByStaffId: true },
  });

  const fromOrder = await activeWaiterId(order?.takenByStaffId);
  if (fromOrder) {
    return fromOrder;
  }

  return activeWaiterId(session.startedByStaffId);
}

export async function getTipAvailability(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      payment: true,
      tip: true,
      table: { select: { restaurantId: true } },
    },
  });

  if (!session) {
    throw new TipError("Session not found", 404);
  }

  if (!session.payment || session.payment.status !== PaymentStatus.PAID) {
    return {
      canTip: false,
      reason: "payment_required" as const,
      alreadyTipped: false,
    };
  }

  if (session.tip) {
    return {
      canTip: false,
      reason: "already_tipped" as const,
      alreadyTipped: true,
    };
  }

  const recipientStaffId = await resolveTipRecipient(sessionId);

  if (!recipientStaffId) {
    return {
      canTip: false,
      reason: "no_server" as const,
      alreadyTipped: false,
    };
  }

  return {
    canTip: true,
    reason: null,
    alreadyTipped: false,
    subtotal: Number(session.payment.subtotal),
  };
}

export async function processMockTipTelebirr(input: MockTipTelebirrInput) {
  const session = await prisma.session.findUnique({
    where: { id: input.sessionId },
    include: {
      payment: true,
      tip: true,
      table: {
        include: { restaurant: true },
      },
    },
  });

  if (!session) {
    throw new TipError("Session not found", 404);
  }

  if (!session.payment || session.payment.status !== PaymentStatus.PAID) {
    throw new TipError("Bill must be paid before tipping", 400);
  }

  if (session.tip) {
    throw new TipError("Tip already recorded for this session", 400);
  }

  const recipientStaffId = await resolveTipRecipient(input.sessionId);

  if (!recipientStaffId) {
    throw new TipError("No server is assigned for this table", 400);
  }

  const restaurantId = session.table.restaurantId;

  if (input.simulateFailure) {
    const tip = await prisma.$transaction(async (tx) => {
      const record = await tx.tip.create({
        data: {
          sessionId: input.sessionId,
          recipientStaffId,
          amount: input.amount,
          status: TipStatus.FAILED,
          telebirrRef: input.billRefNumber,
        },
      });

      await tx.auditLog.create({
        data: {
          restaurantId,
          entityType: "Tip",
          entityId: record.id,
          action: "CUSTOMER_TIP_FAILED",
          actorType: "CUSTOMER",
          payloadJson: {
            amount: input.amount,
            tableNumber: session.table.number,
          },
        },
      });

      return record;
    });

    return {
      success: false,
      message: "Tip could not be processed",
      tipId: tip.id,
    };
  }

  const tip = await prisma.$transaction(async (tx) => {
    const record = await tx.tip.create({
      data: {
        sessionId: input.sessionId,
        recipientStaffId,
        amount: input.amount,
        status: TipStatus.PAID,
        telebirrRef: input.billRefNumber,
      },
    });

    await tx.auditLog.create({
      data: {
        restaurantId,
        entityType: "Tip",
        entityId: record.id,
        action: "CUSTOMER_TIP_PAID",
        actorType: "CUSTOMER",
        payloadJson: {
          amount: input.amount,
          tableNumber: session.table.number,
          recipientStaffId,
        },
      },
    });

    return record;
  });

  await publishRealtimeEvent({
    event: REALTIME_EVENTS.TIP_RECEIVED,
    restaurantId,
    payload: {
      recipientStaffId,
      amount: input.amount,
    },
  });

  return {
    success: true,
    message: "Thank you for tipping your server",
    tipId: tip.id,
  };
}
