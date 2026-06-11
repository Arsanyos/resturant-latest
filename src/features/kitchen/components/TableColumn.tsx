"use client";

import { KitchenStatus } from "@prisma/client";
import { t, type SupportedLocale } from "@/lib/i18n";
import type { KdsTable } from "../types";
import { OrderCard } from "./OrderCard";

export function TableColumn({
  table,
  locale,
  updatingItemId,
  onAdvance,
}: {
  table: KdsTable;
  locale: SupportedLocale;
  updatingItemId: string | null;
  onAdvance: (orderItemId: string, next: KitchenStatus) => void;
}) {
  return (
    <section className="min-w-[280px] flex-1 space-y-3">
      <div className="sticky top-0 z-10 rounded-card border border-card-border bg-secondary px-4 py-2 text-secondary-foreground">
        <p className="text-lg font-bold">
          {table.tableLabel || `${t("customer.table", locale)} ${table.tableNumber}`}
        </p>
      </div>

      {table.orders.map((order) => (
        <OrderCard
          key={order.orderId}
          order={order}
          locale={locale}
          updatingItemId={updatingItemId}
          onAdvance={onAdvance}
        />
      ))}
    </section>
  );
}
