"use client";

import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";
import { StatusChip } from "@/components/shared/StatusChip";
import { t, type SupportedLocale } from "@/lib/i18n";
import { KitchenStatus } from "@prisma/client";
import type { OrderView } from "../utils/order-grouping";

export function OrderStatusList({
  orders,
  currency,
  locale,
  loading,
}: {
  orders: OrderView[];
  currency: string;
  locale: SupportedLocale;
  loading: boolean;
}) {
  if (loading && orders.length === 0) {
    return (
      <AppCard className="text-center text-muted-foreground">
        {t("common.loading", locale)}
      </AppCard>
    );
  }

  if (orders.length === 0) {
    return (
      <AppCard className="text-center text-muted-foreground">
        {t("customer.no_orders", locale)}
      </AppCard>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <AppCard key={order.id}>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-foreground">
              {t("customer.order_number", locale)} {order.orderNumber}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(order.createdAt).toLocaleTimeString()}
            </p>
          </div>
          <ul className="space-y-3">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 border-b border-card-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.name} × {item.quantity}
                  </p>
                  {item.notes && (
                    <p className="text-xs italic text-muted-foreground">
                      {item.notes}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusChip
                    status={item.kitchenStatus as KitchenStatus}
                    locale={locale}
                  />
                  <Money
                    amount={item.unitPrice * item.quantity}
                    currency={currency}
                    className="text-xs"
                  />
                </div>
              </li>
            ))}
          </ul>
        </AppCard>
      ))}
    </div>
  );
}
