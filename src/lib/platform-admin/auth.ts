import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  getPlatformSession,
  type PlatformSessionData,
} from "@/lib/auth/platform-session";
import type { PlatformLoginInput } from "@/lib/validation/platform-admin";

export class PlatformAuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = "PlatformAuthError";
  }
}

export async function loginPlatformAdmin(input: PlatformLoginInput) {
  const admin = await prisma.platformAdmin.findUnique({
    where: { email: input.email },
  });

  if (!admin || !admin.isActive) {
    throw new PlatformAuthError("Invalid credentials");
  }

  const valid = await verifyPassword(input.password, admin.passwordHash);

  if (!valid) {
    throw new PlatformAuthError("Invalid credentials");
  }

  const session = await getPlatformSession();
  session.platformAdminId = admin.id;
  session.role = admin.role;
  await session.save();

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
}

export async function logoutPlatformAdmin() {
  const session = await getPlatformSession();
  session.destroy();
}

export async function getCurrentPlatformAdmin() {
  const session = await getPlatformSession();

  if (!session.platformAdminId) {
    return null;
  }

  const admin = await prisma.platformAdmin.findFirst({
    where: { id: session.platformAdminId, isActive: true },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!admin) {
    await session.destroy();
    return null;
  }

  return admin;
}

export async function requirePlatformAdmin(): Promise<PlatformSessionData> {
  const session = await getPlatformSession();

  if (!session.platformAdminId || !session.role) {
    throw new PlatformAuthError("Unauthorized", 401);
  }

  const admin = await prisma.platformAdmin.findFirst({
    where: { id: session.platformAdminId, isActive: true },
    select: { id: true, role: true },
  });

  if (!admin) {
    throw new PlatformAuthError("Unauthorized", 401);
  }

  return { platformAdminId: admin.id, role: admin.role };
}
