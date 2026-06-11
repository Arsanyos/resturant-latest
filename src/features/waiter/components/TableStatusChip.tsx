import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { WaiterTableStatus } from "@/lib/waiter/service";

const STYLES: Record<WaiterTableStatus, string> = {
  idle: "bg-muted text-muted-foreground border-card-border",
  active: "bg-secondary/10 text-secondary border-secondary/20",
  awaiting_payment: "bg-warning/15 text-warning border-warning/30",
  assistance_requested: "bg-danger/15 text-danger border-danger/30",
};

const KEYS: Record<WaiterTableStatus, string> = {
  idle: "waiter.status.idle",
  active: "waiter.status.active",
  awaiting_payment: "waiter.status.awaiting_payment",
  assistance_requested: "waiter.status.assistance_requested",
};

export function TableStatusChip({
  status,
  locale = "en",
}: {
  status: WaiterTableStatus;
  locale?: SupportedLocale;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-pill border px-2.5 py-0.5 text-xs font-medium",
        STYLES[status]
      )}
    >
      {t(KEYS[status], locale)}
    </span>
  );
}
