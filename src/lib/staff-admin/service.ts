import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import type { StaffSessionData } from "@/lib/auth/session";
import type {
  CreateStaffInput,
  UpdateStaffInput,
} from "@/lib/validation/staff-admin";

export class StaffAdminError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "StaffAdminError";
  }
}

export async function listStaff(restaurantId: string) {
  const staff = await prisma.staff.findMany({
    where: { restaurantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return { staff };
}

export async function createStaffMember(
  restaurantId: string,
  input: CreateStaffInput,
  actor: StaffSessionData
) {
  const existing = await prisma.staff.findUnique({
    where: {
      restaurantId_email: { restaurantId, email: input.email },
    },
  });

  if (existing) {
    throw new StaffAdminError("Email already in use", 409);
  }

  const passwordHash = await hashPassword(input.password);

  const member = await prisma.$transaction(async (tx) => {
    const record = await tx.staff.create({
      data: {
        restaurantId,
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      },
    });

    await tx.auditLog.create({
      data: {
        restaurantId,
        entityType: "Staff",
        entityId: record.id,
        action: "OWNER_CREATED_STAFF",
        actorType: "STAFF",
        actorStaffId: actor.staffId,
        payloadJson: { email: input.email, role: input.role },
      },
    });

    return record;
  });

  return {
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    isActive: member.isActive,
  };
}

export async function updateStaffMember(
  staffId: string,
  input: UpdateStaffInput,
  actor: StaffSessionData
) {
  const existing = await prisma.staff.findFirst({
    where: { id: staffId, restaurantId: actor.restaurantId },
  });

  if (!existing) {
    throw new StaffAdminError("Staff not found", 404);
  }

  const data: {
    name?: string;
    role?: typeof input.role;
    isActive?: boolean;
    passwordHash?: string;
  } = {};

  if (input.name) data.name = input.name;
  if (input.role) data.role = input.role;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.password) data.passwordHash = await hashPassword(input.password);

  const member = await prisma.$transaction(async (tx) => {
    const record = await tx.staff.update({
      where: { id: staffId },
      data,
    });

    await tx.auditLog.create({
      data: {
        restaurantId: actor.restaurantId,
        entityType: "Staff",
        entityId: staffId,
        action: "OWNER_UPDATED_STAFF",
        actorType: "STAFF",
        actorStaffId: actor.staffId,
        payloadJson: { ...input, password: input.password ? "[redacted]" : undefined },
      },
    });

    return record;
  });

  return {
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    isActive: member.isActive,
  };
}

export async function deactivateStaffMember(
  staffId: string,
  actor: StaffSessionData
) {
  return updateStaffMember(staffId, { isActive: false }, actor);
}

export type { CreateStaffInput, UpdateStaffInput };
