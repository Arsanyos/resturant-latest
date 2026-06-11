import { getStaffSession } from "@/lib/auth/session";
import { canActor, type StaffAction } from "@/lib/auth/permissions";

export class StaffAuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "StaffAuthError";
  }
}

export async function requireStaff(options?: {
  restaurantSlug?: string;
  action?: StaffAction;
}) {
  const session = await getStaffSession();

  if (!session.staffId || !session.role) {
    throw new StaffAuthError("Unauthorized", 401);
  }

  if (
    options?.restaurantSlug &&
    session.restaurantSlug !== options.restaurantSlug
  ) {
    throw new StaffAuthError("Forbidden", 403);
  }

  if (options?.action && !canActor(session.role, options.action)) {
    throw new StaffAuthError("Forbidden", 403);
  }

  return session;
}
