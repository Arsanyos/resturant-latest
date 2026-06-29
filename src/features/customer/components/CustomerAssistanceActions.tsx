"use client";

import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCustomerAssistance } from "../hooks/use-customer-assistance";

export function CustomerAssistanceActions({
  sessionId,
  tableId,
  locale,
  sticky = false,
}: {
  sessionId: string | null;
  tableId: string;
  locale: SupportedLocale;
  sticky?: boolean;
}) {
  const { status, requestLoading, requestAssistance } =
    useCustomerAssistance(sessionId, tableId);

  if (!sessionId) return null;

  if (status === "ACKNOWLEDGED") {
    return (
      <div
        className={cn(
          "rounded-lg border border-success/30 bg-success/10 px-4 py-4",
          !sticky && "mt-6"
        )}
      >
        <p className="font-medium text-success">
          {t("customer.assistance_acknowledged", locale)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("customer.assistance_acknowledged_hint", locale)}
        </p>
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <div className={cn("space-y-3", !sticky && "mt-6")}>
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
          {t("customer.assistance_sent", locale)}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("customer.assistance_pending_hint", locale)}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={requestLoading}
      onClick={() => void requestAssistance()}
      className={cn(
        "rounded-pill bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60",
        sticky ? "w-full" : "mt-6"
      )}
    >
      {requestLoading
        ? t("common.loading", locale)
        : t("customer.request_assistance", locale)}
    </button>
  );
}
