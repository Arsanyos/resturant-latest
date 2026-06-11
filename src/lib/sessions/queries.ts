import { SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";

export async function getActiveSessionForTable(tableId: string) {
  return prisma.session.findFirst({
    where: {
      tableId,
      status: SessionStatus.ACTIVE,
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function verifyDeviceToken(
  token: string,
  hash: string | null | undefined
): Promise<boolean> {
  if (!hash) {
    return false;
  }
  return verifyPassword(token, hash);
}
