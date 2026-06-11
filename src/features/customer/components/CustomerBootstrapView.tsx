"use client";

import { useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { useDeviceToken } from "@/lib/auth/use-device-token";
import { useLocale } from "@/lib/i18n/use-locale";
import { t } from "@/lib/i18n";
import { useSessionStatus } from "../hooks/use-session-status";
import { BlockedDeviceScreen } from "./BlockedDeviceScreen";
import { CustomerShell } from "./CustomerShell";
import { WaiterSessionMessage } from "./WaiterSessionMessage";

interface CustomerBootstrapViewProps {
  slug: string;
  tableNumber: number;
}

export function CustomerBootstrapView({
  slug,
  tableNumber,
}: CustomerBootstrapViewProps) {
  const { locale, setLocale } = useLocale();
  const { getToken, setToken } = useDeviceToken(slug, tableNumber);
  const { data, loading, error, refresh } = useSessionStatus(
    slug,
    tableNumber,
    getToken
  );
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function handleStartSession() {
    setStarting(true);
    setStartError(null);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantSlug: slug, tableNumber }),
      });

      if (response.status === 409) {
        await refresh();
        return;
      }

      if (!response.ok) throw new Error("Session create failed");

      const json = (await response.json()) as { deviceToken: string };
      setToken(json.deviceToken);
      await refresh();
    } catch {
      setStartError(t("customer.session_error", locale));
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <AppCard className="text-center text-muted-foreground">
        {t("common.loading", locale)}
      </AppCard>
    );
  }

  if (error) {
    return (
      <AppCard className="text-center">
        <p className="text-danger">{t("customer.bootstrap_error", locale)}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-4 rounded-pill bg-primary px-6 py-2 text-primary-foreground"
        >
          {t("common.retry", locale)}
        </button>
      </AppCard>
    );
  }

  if (!data) return null;

  if (!data.isOpen && data.sessionState === "none") {
    return (
      <AppCard className="text-center">
        <p className="font-medium text-foreground">
          {t("customer.closed", locale)}
        </p>
      </AppCard>
    );
  }

  if (data.sessionState === "active_blocked_device") {
    return (
      <BlockedDeviceScreen
        sessionId={data.sessionId}
        tableId={data.table.id}
        locale={locale}
      />
    );
  }

  if (data.sessionState === "waiter_started") {
    return (
      <div className="space-y-4">
        <WaiterSessionMessage
          sessionId={data.sessionId}
          tableId={data.table.id}
          locale={locale}
        />
        <CustomerShell
          data={data}
          locale={locale}
          onLocaleChange={setLocale}
          getToken={getToken}
          taxPct={data.restaurant.taxPct}
          servicePct={data.restaurant.servicePct}
          readOnly
          onSessionClosed={() => void refresh()}
        />
      </div>
    );
  }

  if (data.sessionState === "none") {
    return (
      <AppCard className="text-center">
        <p className="font-medium text-foreground">
          {t("customer.start_session", locale)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("customer.start_session_hint", locale)}
        </p>
        {startError && (
          <p className="mt-2 text-sm text-danger">{startError}</p>
        )}
        <button
          type="button"
          disabled={starting}
          onClick={() => void handleStartSession()}
          className="mt-6 rounded-pill bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-60"
        >
          {starting
            ? t("common.loading", locale)
            : t("customer.start_ordering", locale)}
        </button>
      </AppCard>
    );
  }

  return (
    <CustomerShell
      data={data}
      locale={locale}
      onLocaleChange={setLocale}
      getToken={getToken}
      taxPct={data.restaurant.taxPct}
      servicePct={data.restaurant.servicePct}
      onSessionClosed={() => void refresh()}
    />
  );
}
