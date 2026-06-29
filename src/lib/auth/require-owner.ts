import { StaffRole } from "@prisma/client";
import { requireStaff, StaffAuthError } from "@/lib/auth/require-staff";

export async function requireOwner(restaurantSlug?: string) {
  const staff = await requireStaff({
    restaurantSlug,
    action: "access_admin",
  });

  if (staff.role !== StaffRole.OWNER) {
    throw new StaffAuthError("Forbidden", 403);
  }

  return staff;
}
