"use client";

import { StaffRole } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";
import { useAssistanceRequests } from "../hooks/use-assistance-requests";
import { useTableAssignments } from "../hooks/use-table-assignments";
import { useWaiterNotifications } from "../hooks/use-waiter-notifications";
import { useWaiterTableDetail } from "../hooks/use-waiter-table-detail";
import { useWaiterTips } from "../hooks/use-waiter-tips";
import { AssistanceInbox } from "./AssistanceInbox";
import { TableDetailPanel } from "./TableDetailPanel";
import { TableGrid } from "./TableGrid";

export function WaiterDashboard({
  slug,
  restaurantId,
  restaurantName,
  currency,
}: {
  slug: string;
  restaurantId: string;
  restaurantName: string;
  currency: string;
}) {
  const { locale, setLocale } = useLocale();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string>("");

  const { notification, dismiss: dismissNotification } =
    useWaiterNotifications(restaurantId);

  const { data, loading, error, refresh: refreshTables } =
    useTableAssignments(slug, restaurantId);
  const {
    requests,
    loading: assistanceLoading,
    refresh: refreshAssistance,
  } = useAssistanceRequests(slug, restaurantId);
  const {
    detail,
    loading: detailLoading,
    refresh: refreshDetail,
  } = useWaiterTableDetail(slug, selectedTableId, restaurantId);
  const { tipCount, tipTotal, currency: tipCurrency } = useWaiterTips(
    slug,
    restaurantId
  );

  useEffect(() => {
    void fetch("/api/auth/staff/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { name?: string } | null) => {
        if (json?.name) setStaffName(json.name);
      });
  }, []);

  const handleRefreshAll = useCallback(() => {
    void refreshTables();
    void refreshAssistance();
    void refreshDetail();
  }, [refreshTables, refreshAssistance, refreshDetail]);

  async function patchAssistance(
    requestId: string,
    status: "ACKNOWLEDGED" | "RESOLVED"
  ) {
    await fetch(`/api/assistance/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    handleRefreshAll();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-card-border bg-card px-4 py-4 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("waiter.route_label", locale)}
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              {restaurantName}
            </h1>
            {staffName && (
              <p className="text-sm text-muted-foreground">{staffName}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RoleBadge role={StaffRole.WAITER} locale={locale} />
            <LanguageToggle locale={locale} onChange={setLocale} />
          </div>
        </div>
      </header>

      {notification && (
        <div
          className={`border-b px-4 py-3 lg:px-6 ${
            notification.type === "assistance"
              ? "border-warning/30 bg-warning/10"
              : "border-primary/30 bg-primary/10"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <p
              className={`text-sm font-medium ${
                notification.type === "assistance"
                  ? "text-warning"
                  : "text-primary"
              }`}
            >
              {t(
                notification.type === "assistance"
                  ? "waiter.notify_assistance"
                  : "waiter.notify_new_session",
                locale
              ).replace("{table}", String(notification.tableNumber))}
            </p>
            <button
              type="button"
              onClick={dismissNotification}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              {t("waiter.dismiss", locale)}
            </button>
          </div>
        </div>
      )}

      <div className="grid min-w-0 gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <main className="min-w-0 space-y-4">
          <AppCard className="flex flex-wrap items-center justify-between gap-3 border-primary/20 bg-primary/5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("waiter.tips_today", locale)}
              </p>
              <p className="text-2xl font-bold text-foreground">
                <Money amount={tipTotal} currency={tipCurrency} />
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("waiter.tips_count", locale).replace("{count}", String(tipCount))}
            </p>
          </AppCard>

          <h2 className="text-lg font-semibold text-foreground">
            {t("waiter.table_grid", locale)}
          </h2>

          {loading && (
            <p className="text-muted-foreground">
              {t("common.loading", locale)}
            </p>
          )}
          {error && (
            <p className="text-danger">{t("waiter.load_error", locale)}</p>
          )}
          {!loading && !error && (
            <TableGrid
              tables={data.tables}
              selectedTableId={selectedTableId}
              locale={locale}
              onSelect={setSelectedTableId}
            />
          )}
        </main>

        <aside className="min-w-0 space-y-4">
          <AssistanceInbox
            requests={requests}
            loading={assistanceLoading}
            locale={locale}
            onAcknowledge={(id) => patchAssistance(id, "ACKNOWLEDGED")}
            onResolve={(id) => patchAssistance(id, "RESOLVED")}
            onOpenTable={setSelectedTableId}
          />
        </aside>

        {selectedTableId && (
          <aside className="xl:col-span-1">
            <TableDetailPanel
              slug={slug}
              detail={detail}
              loading={detailLoading}
              locale={locale}
              currency={currency}
              onRefresh={handleRefreshAll}
              onClose={() => setSelectedTableId(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
