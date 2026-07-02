import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getStaffSession, StaffSessionData } from "@/lib/auth/session";
import type {
  ChangeStaffPasswordInput,
  StaffLoginInput,
} from "@/lib/validation/staff";
import { resolveRestaurantBySlug } from "@/lib/restaurants/service";

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function loginStaff(input: StaffLoginInput) {
  const restaurant = await resolveRestaurantBySlug(input.restaurantSlug);

  if (!restaurant) {
    throw new AuthError("Invalid credentials");
  }

  const staff = await prisma.staff.findUnique({
    where: {
      restaurantId_email: {
        restaurantId: restaurant.id,
        email: input.email,
      },
    },
  });

  if (!staff || !staff.isActive) {
    throw new AuthError("Invalid credentials");
  }

  const valid = await verifyPassword(input.password, staff.passwordHash);

  if (!valid) {
    throw new AuthError("Invalid credentials");
  }

  const session = await getStaffSession();
  const sessionData: StaffSessionData = {
    staffId: staff.id,
    restaurantId: restaurant.id,
    restaurantSlug: restaurant.slug,
    role: staff.role,
  };

  session.staffId = sessionData.staffId;
  session.restaurantId = sessionData.restaurantId;
  session.restaurantSlug = sessionData.restaurantSlug;
  session.role = sessionData.role;
  await session.save();

  return {
    staffId: staff.id,
    restaurantId: restaurant.id,
    restaurantSlug: restaurant.slug,
    role: staff.role,
    name: staff.name,
  };
}

export async function logoutStaff() {
  const session = await getStaffSession();
  session.destroy();
}

export async function getCurrentStaff() {
  const session = await getStaffSession();

  if (!session.staffId) {
    return null;
  }

  const staff = await prisma.staff.findFirst({
    where: {
      id: session.staffId,
      restaurantId: session.restaurantId,
      isActive: true,
    },
  });

  if (!staff) {
    await session.destroy();
    return null;
  }

  return {
    staffId: staff.id,
    restaurantId: session.restaurantId,
    restaurantSlug: session.restaurantSlug,
    role: staff.role,
    name: staff.name,
    email: staff.email,
  };
}

export async function changeCurrentStaffPassword(
  input: ChangeStaffPasswordInput
) {
  const session = await getStaffSession();

  if (!session.staffId || !session.restaurantId) {
    throw new AuthError("Unauthorized", 401);
  }

  const staff = await prisma.staff.findFirst({
    where: {
      id: session.staffId,
      restaurantId: session.restaurantId,
      isActive: true,
    },
  });

  if (!staff) {
    throw new AuthError("Unauthorized", 401);
  }

  const valid = await verifyPassword(input.currentPassword, staff.passwordHash);
  if (!valid) {
    throw new AuthError("Current password is incorrect", 400);
  }

  const newPasswordHash = await hashPassword(input.newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.staff.update({
      where: { id: staff.id },
      data: { passwordHash: newPasswordHash },
    });

    await tx.auditLog.create({
      data: {
        restaurantId: session.restaurantId,
        entityType: "Staff",
        entityId: staff.id,
        action: "STAFF_CHANGED_OWN_PASSWORD",
        actorType: "STAFF",
        actorStaffId: staff.id,
        payloadJson: {},
      },
    });
  });

  return { ok: true };
}
