import { StaffRole } from "@prisma/client";
import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ROLE_KEYS: Record<StaffRole, string> = {
  OWNER: "role.admin",
  WAITER: "role.waiter",
  KITCHEN: "role.kitchen",
  CASHIER: "role.cashier",
};

export function RoleBadge({
  role,
  locale = "en",
  className,
}: {
  role: StaffRole;
  locale?: SupportedLocale;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-pill bg-muted px-3 py-1 text-xs font-medium text-muted-foreground",
        className
      )}
    >
      {t(ROLE_KEYS[role], locale)}
    </span>
  );
}
