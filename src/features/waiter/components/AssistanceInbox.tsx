"use client";

import { AppCard } from "@/components/shared/AppCard";
import { t, type SupportedLocale } from "@/lib/i18n";
import type { AssistanceRequestSummary } from "../types";

export function AssistanceInbox({
  requests,
  loading,
  locale,
  onAcknowledge,
  onResolve,
  onOpenTable,
}: {
  requests: AssistanceRequestSummary[];
  loading: boolean;
  locale: SupportedLocale;
  onAcknowledge: (requestId: string) => Promise<void>;
  onResolve: (requestId: string) => Promise<void>;
  onOpenTable: (tableId: string) => void;
}) {
  const pending = requests.filter((r) => r.status === "PENDING");

  return (
    <AppCard className="min-w-0 overflow-hidden">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        {t("waiter.assistance_inbox", locale)}
        {pending.length > 0 && (
          <span className="ml-2 rounded-pill bg-danger px-2 py-0.5 text-xs text-white">
            {pending.length}
          </span>
        )}
      </h2>

      {loading && (
        <p className="text-sm text-muted-foreground">
          {t("common.loading", locale)}
        </p>
      )}

      {!loading && requests.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("waiter.assistance_empty", locale)}
        </p>
      )}

      <ul className="space-y-3">
        {requests.map((req) => (
          <li
            key={req.id}
            className="overflow-hidden rounded-lg border border-card-border bg-background p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {t("customer.table", locale)} {req.tableNumber} —{" "}
                  {req.tableLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(req.createdAt).toLocaleTimeString()}
                </p>
                {req.deviceInfo && (
                  <p
                    className="mt-1 truncate text-xs text-muted-foreground"
                    title={req.deviceInfo}
                  >
                    {req.deviceInfo}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-pill border border-card-border px-2 py-0.5 text-xs">
                {req.status}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenTable(req.tableId)}
                className="rounded-pill border border-card-border px-3 py-1 text-xs font-medium"
              >
                {t("waiter.open_table", locale)}
              </button>
              {req.status === "PENDING" && (
                <button
                  type="button"
                  onClick={() => void onAcknowledge(req.id)}
                  className="rounded-pill bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {t("waiter.acknowledge", locale)}
                </button>
              )}
              {req.status !== "RESOLVED" && (
                <button
                  type="button"
                  onClick={() => void onResolve(req.id)}
                  className="rounded-pill bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                >
                  {t("waiter.resolve", locale)}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </AppCard>
  );
}
