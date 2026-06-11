import { StaffRole } from "@prisma/client";

export function roleDashboardPath(slug: string, role: StaffRole): string {
  switch (role) {
    case StaffRole.OWNER:
      return `/r/${slug}/admin`;
    case StaffRole.WAITER:
      return `/r/${slug}/waiter`;
    case StaffRole.KITCHEN:
      return `/r/${slug}/kitchen`;
    case StaffRole.CASHIER:
      return `/r/${slug}/cashier`;
    default:
      return `/r/${slug}/staff`;
  }
}
