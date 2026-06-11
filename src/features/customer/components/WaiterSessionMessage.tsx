"use client";

import { AppCard } from "@/components/shared/AppCard";
import { t, type SupportedLocale } from "@/lib/i18n";
import { CustomerAssistanceActions } from "./CustomerAssistanceActions";

export function WaiterSessionMessage({
  sessionId,
  tableId,
  locale,
}: {
  sessionId: string | null;
  tableId: string;
  locale: SupportedLocale;
}) {
  return (
    <AppCard className="text-center">
      <p className="font-medium text-foreground">
        {t("customer.waiter_session_title", locale)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("customer.waiter_session_hint", locale)}
      </p>
      <CustomerAssistanceActions
        sessionId={sessionId}
        tableId={tableId}
        locale={locale}
      />
    </AppCard>
  );
}
