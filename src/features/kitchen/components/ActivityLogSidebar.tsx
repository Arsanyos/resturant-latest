"use client";

import { AppCard } from "@/components/shared/AppCard";
import { t, type SupportedLocale } from "@/lib/i18n";
import type { ActivityEntry } from "../types";

function formatActivityLine(entry: ActivityEntry, locale: SupportedLocale): string {
  const time = new Date(entry.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const payload = entry.payload;
  const tableNumber = payload.tableNumber as number | undefined;
  const itemName = (payload.name as string | undefined) ?? "Item";
  const to = payload.to as string | undefined;

  if (entry.action === "ORDER_ITEM_STATUS_CHANGED" && to) {
    const statusKey =
      to === "BEING_PREPARED"
        ? "status.being_prepared"
        : to === "SERVED"
          ? "status.served"
          : "status.pending";
    return t("kitchen.activity.status_changed", locale)
      .replace("{time}", time)
      .replace("{table}", String(tableNumber ?? "?"))
      .replace("{item}", itemName)
      .replace("{status}", t(statusKey, locale));
  }

  return `${time} — ${entry.action}`;
}

export function ActivityLogSidebar({
  entries,
  loading,
  locale,
}: {
  entries: ActivityEntry[];
  loading: boolean;
  locale: SupportedLocale;
}) {
  return (
    <aside className="w-full shrink-0 lg:w-72">
      <AppCard className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <p className="mb-2 text-xs text-muted-foreground">
          {t("kitchen.shared_login_notice", locale)}
        </p>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          {t("kitchen.activity_title", locale)}
        </h2>

        {loading && entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("common.loading", locale)}
          </p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("kitchen.activity_empty", locale)}
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="border-b border-card-border pb-2 text-xs text-muted-foreground last:border-0"
              >
                {formatActivityLine(entry, locale)}
              </li>
            ))}
          </ul>
        )}
      </AppCard>
    </aside>
  );
}
