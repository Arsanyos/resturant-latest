"use client";

import { KitchenStatus } from "@prisma/client";
import { StatusChip } from "@/components/shared/StatusChip";
import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { KdsOrderItem } from "../types";
import { StatusActionButton } from "./StatusActionButton";

export function OrderItemRow({
  item,
  locale,
  updating,
  onAdvance,
}: {
  item: KdsOrderItem;
  locale: SupportedLocale;
  updating: boolean;
  onAdvance: (orderItemId: string, next: KitchenStatus) => void;
}) {
  const cancelled = item.kitchenStatus === KitchenStatus.CANCELLED;

  return (
    <div
      className={cn(
        "rounded-xl border border-card-border p-3",
        cancelled && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {item.quantity}× {t(item.nameI18nKey, locale)}
          </p>
          {item.variantNameI18nKey && (
            <p className="text-xs text-muted-foreground">
              {t(item.variantNameI18nKey, locale)}
            </p>
          )}
          {item.modifiers.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {item.modifiers.map((m) => t(m.nameI18nKey, locale)).join(", ")}
            </p>
          )}
          {item.notes && (
            <p className="mt-1 text-xs italic text-muted-foreground">
              {t("customer.special_instructions", locale)}: {item.notes}
            </p>
          )}
          {item.cancelReason && (
            <p className="mt-1 text-xs text-danger">
              {item.cancelReason}
            </p>
          )}
        </div>
        <StatusChip status={item.kitchenStatus} locale={locale} />
      </div>

      {!cancelled && (
        <div className="mt-3">
          <StatusActionButton
            status={item.kitchenStatus}
            locale={locale}
            updating={updating}
            onAdvance={(next) => onAdvance(item.orderItemId, next)}
          />
        </div>
      )}
    </div>
  );
}
