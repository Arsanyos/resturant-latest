import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CashierSessionChip } from "@/lib/cashier/service";

const STYLES: Record<CashierSessionChip, string> = {
  in_kitchen: "bg-secondary/10 text-secondary border-secondary/20",
  ready_to_pay: "bg-warning/15 text-warning border-warning/30",
  partially_paid: "bg-primary/10 text-primary border-primary/30",
  verification_pending: "bg-danger/15 text-danger border-danger/30",
};

const KEYS: Record<CashierSessionChip, string> = {
  in_kitchen: "cashier.chip.in_kitchen",
  ready_to_pay: "cashier.chip.ready_to_pay",
  partially_paid: "cashier.chip.partially_paid",
  verification_pending: "cashier.chip.verification_pending",
};

export function SessionStatusChip({
  chip,
  locale = "en",
}: {
  chip: CashierSessionChip;
  locale?: SupportedLocale;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-pill border px-2.5 py-0.5 text-xs font-medium",
        STYLES[chip]
      )}
    >
      {t(KEYS[chip], locale)}
    </span>
  );
}
