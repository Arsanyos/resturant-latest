"use client";

import { KitchenStatus } from "@prisma/client";
import { AppCard } from "@/components/shared/AppCard";
import { t, type SupportedLocale } from "@/lib/i18n";
import type { KdsOrder } from "../types";
import { OrderItemRow } from "./OrderItemRow";

export function OrderCard({
  order,
  locale,
  updatingItemId,
  onAdvance,
}: {
  order: KdsOrder;
  locale: SupportedLocale;
  updatingItemId: string | null;
  onAdvance: (orderItemId: string, next: KitchenStatus) => void;
}) {
  const time = new Date(order.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <AppCard className="space-y-3">
      <div className="flex items-center justify-between border-b border-card-border pb-2">
        <p className="font-semibold text-foreground">
          {t("customer.order_number", locale)} #{order.orderNumber}
        </p>
        <p className="text-sm text-muted-foreground">{time}</p>
      </div>

      <div className="space-y-3">
        {order.items.map((item) => (
          <OrderItemRow
            key={item.orderItemId}
            item={item}
            locale={locale}
            updating={updatingItemId === item.orderItemId}
            onAdvance={onAdvance}
          />
        ))}
      </div>
    </AppCard>
  );
}
