import { KitchenStatus } from "@prisma/client";
import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<KitchenStatus, string> = {
  PENDING: "bg-warning/15 text-warning border-warning/30",
  BEING_PREPARED: "bg-secondary/10 text-secondary border-secondary/20",
  SERVED: "bg-success/15 text-success border-success/30",
  CANCELLED: "bg-muted text-muted-foreground border-card-border",
};

const STATUS_KEYS: Record<KitchenStatus, string> = {
  PENDING: "status.pending",
  BEING_PREPARED: "status.being_prepared",
  SERVED: "status.served",
  CANCELLED: "status.cancelled",
};

export function StatusChip({
  status,
  locale = "en",
}: {
  status: KitchenStatus;
  locale?: SupportedLocale;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-pill border px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      {t(STATUS_KEYS[status], locale)}
    </span>
  );
}
