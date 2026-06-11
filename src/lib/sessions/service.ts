import { randomBytes } from "crypto";
import { StartedByType, SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import type { SessionState } from "@/lib/validation/session";
import { getActiveSessionForTable, verifyDeviceToken } from "./queries";

export function generateDeviceToken(): string {
  return randomBytes(32).toString("hex");
}

export async function hashDeviceToken(token: string): Promise<string> {
  return hashPassword(token);
}

export async function resolveSessionState(
  tableId: string,
  deviceToken?: string
): Promise<{
  sessionState: SessionState;
  sessionId: string | null;
}> {
  const session = await getActiveSessionForTable(tableId);

  if (!session) {
    return { sessionState: "none", sessionId: null };
  }

  if (session.startedByType === StartedByType.WAITER) {
    return { sessionState: "waiter_started", sessionId: session.id };
  }

  if (!deviceToken) {
    return { sessionState: "active_blocked_device", sessionId: session.id };
  }

  const matches = await verifyDeviceToken(
    deviceToken,
    session.deviceTokenHash
  );

  if (matches) {
    return { sessionState: "active_same_device", sessionId: session.id };
  }

  return { sessionState: "active_blocked_device", sessionId: session.id };
}

export async function createCustomerSession(tableId: string) {
  const existing = await getActiveSessionForTable(tableId);

  if (existing) {
    throw new Error("TABLE_HAS_ACTIVE_SESSION");
  }

  const deviceToken = generateDeviceToken();
  const deviceTokenHash = await hashDeviceToken(deviceToken);

  const session = await prisma.session.create({
    data: {
      tableId,
      status: SessionStatus.ACTIVE,
      startedByType: StartedByType.CUSTOMER,
      deviceTokenHash,
    },
  });

  return { session, deviceToken };
}

export async function getSessionById(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      table: {
        include: {
          restaurant: true,
        },
      },
    },
  });
}

export async function createWaiterSession(
  tableId: string,
  staffId: string,
  restaurantId: string
) {
  const existing = await getActiveSessionForTable(tableId);

  if (existing) {
    throw new Error("TABLE_HAS_ACTIVE_SESSION");
  }

  const table = await prisma.table.findFirst({
    where: { id: tableId, restaurantId },
  });

  if (!table) {
    throw new Error("TABLE_NOT_FOUND");
  }

  const session = await prisma.session.create({
    data: {
      tableId,
      status: SessionStatus.ACTIVE,
      startedByType: StartedByType.WAITER,
      startedByStaffId: staffId,
      deviceTokenHash: null,
    },
    include: {
      table: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      restaurantId,
      entityType: "Session",
      entityId: session.id,
      action: "WAITER_OPENED_SESSION",
      actorType: "STAFF",
      actorStaffId: staffId,
      payloadJson: {
        tableId,
        tableNumber: table.number,
      },
    },
  });

  return session;
}
