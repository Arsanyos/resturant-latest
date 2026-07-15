"use client";

import { useState } from "react";
import { StaffRole } from "@prisma/client";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { useLocale } from "@/lib/i18n/use-locale";
import { t } from "@/lib/i18n";
import { KitchenStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import type { KitchenTab, KitchenWindow } from "../types";
import { useKdsOrders } from "../hooks/use-kds-orders";
import { useKitchenActivity } from "../hooks/use-kitchen-activity";
import { ActivityLogSidebar } from "./ActivityLogSidebar";
import { KitchenMenuAvailabilityView } from "./KitchenMenuAvailabilityView";
import { TableColumn } from "./TableColumn";
import { TimeFilter } from "./TimeFilter";

export function KdsBoard({
  slug,
  restaurantId,
  restaurantName,
}: {
  slug: string;
  restaurantId: string;
  restaurantName: string;
}) {
  const { locale, setLocale } = useLocale();
  const [tab, setTab] = useState<KitchenTab>("orders");
  const [window, setWindow] = useState<KitchenWindow>("all");
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [activityKey, setActivityKey] = useState(0);

  const { data, loading, error, refresh } = useKdsOrders(
    slug,
    restaurantId,
    window
  );
  const { entries, loading: activityLoading } = useKitchenActivity(
    slug,
    activityKey
  );

  async function handleAdvance(orderItemId: string, next: KitchenStatus) {
    setUpdatingItemId(orderItemId);
    try {
      const response = await fetch(`/api/order-items/${orderItemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) throw new Error("Update failed");
      await refresh();
      setActivityKey((k) => k + 1);
    } finally {
      setUpdatingItemId(null);
    }
  }

  const hasOrders = data.tables.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-card-border bg-card px-4 py-4 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("kitchen.route_label", locale)}
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              {restaurantName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {tab === "orders" ? (
              <TimeFilter value={window} onChange={setWindow} locale={locale} />
            ) : null}
            <RoleBadge role={StaffRole.KITCHEN} locale={locale} />
            <LanguageToggle locale={locale} onChange={setLocale} />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {(
            [
              { id: "orders" as const, label: t("kitchen.tab.orders", locale) },
              { id: "menu" as const, label: t("kitchen.tab.menu", locale) },
            ] as const
          ).map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={cn(
                "rounded-pill px-4 py-2 text-sm font-medium transition",
                tab === entry.id
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </header>

      {tab === "menu" ? (
        <div className="p-4 lg:p-6">
          <KitchenMenuAvailabilityView
            slug={slug}
            restaurantId={restaurantId}
            locale={locale}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6 p-4 lg:flex-row lg:p-6">
          <main className="min-w-0 flex-1">
            {loading && !hasOrders ? (
              <p className="text-center text-muted-foreground">
                {t("common.loading", locale)}
              </p>
            ) : error ? (
              <p className="text-center text-danger">
                {t("kitchen.load_error", locale)}
              </p>
            ) : !hasOrders ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-card border border-card-border bg-card p-8 text-center">
                <p className="text-xl font-bold text-foreground">
                  {t("kitchen.empty_title", locale)}
                </p>
                <p className="mt-2 text-muted-foreground">
                  {t("kitchen.empty_subtitle", locale)}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:overflow-x-auto">
                {data.tables.map((table) => (
                  <TableColumn
                    key={table.tableId}
                    table={table}
                    locale={locale}
                    updatingItemId={updatingItemId}
                    onAdvance={handleAdvance}
                  />
                ))}
              </div>
            )}
          </main>

          <ActivityLogSidebar
            entries={entries}
            loading={activityLoading}
            locale={locale}
          />
        </div>
      )}
    </div>
  );
}
