import { StaffRole } from "@prisma/client";

export type StaffAction =
  | "access_waiter"
  | "access_kitchen"
  | "access_cashier"
  | "access_admin";

const ROLE_PERMISSIONS: Record<StaffRole, StaffAction[]> = {
  OWNER: [
    "access_waiter",
    "access_kitchen",
    "access_cashier",
    "access_admin",
  ],
  WAITER: ["access_waiter"],
  KITCHEN: ["access_kitchen"],
  CASHIER: ["access_cashier"],
};

export function canActor(role: StaffRole, action: StaffAction): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

export function getRequiredActionForPath(
  pathname: string
): StaffAction | null {
  if (pathname.includes("/waiter")) return "access_waiter";
  if (pathname.includes("/kitchen")) return "access_kitchen";
  if (pathname.includes("/cashier")) return "access_cashier";
  if (pathname.includes("/admin")) return "access_admin";
  return null;
}
