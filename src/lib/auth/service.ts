import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { getStaffSession, StaffSessionData } from "@/lib/auth/session";
import type { StaffLoginInput } from "@/lib/validation/staff";
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
  };
}
