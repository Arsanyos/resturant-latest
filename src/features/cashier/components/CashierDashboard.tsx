"use client";

import { StaffRole } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";
import { useCashierSessions } from "../hooks/use-cashier-sessions";
import { useSessionBill } from "../hooks/use-session-bill";
import { useVerificationQueue } from "../hooks/use-verification-queue";
import { BillDetail } from "./BillDetail";
import { SessionList } from "./SessionList";
import { VerificationQueue } from "./VerificationQueue";

export function CashierDashboard({
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
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [staffName, setStaffName] = useState("");

  const { sessions, loading, error, refresh: refreshSessions } =
    useCashierSessions(slug, restaurantId);
  const { bill, loading: billLoading, refresh: refreshBill } = useSessionBill(
    slug,
    selectedSessionId
  );
  const {
    items: verificationItems,
    loading: verificationLoading,
    refresh: refreshVerification,
  } = useVerificationQueue(slug);

  useEffect(() => {
    if (
      selectedSessionId &&
      !sessions.some((s) => s.sessionId === selectedSessionId)
    ) {
      setSelectedSessionId(null);
    }
  }, [sessions, selectedSessionId]);

  useEffect(() => {
    void fetch("/api/auth/staff/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { name?: string } | null) => {
        if (json?.name) setStaffName(json.name);
      });
  }, []);

  const handleRefreshAll = useCallback(() => {
    void refreshSessions(true);
    void refreshBill();
    void refreshVerification();
  }, [refreshSessions, refreshBill, refreshVerification]);

  async function handleVerify(transactionId: string, verified: boolean) {
    await fetch("/api/payments/telebirr/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, verified }),
    });
    handleRefreshAll();
    if (verified) setSelectedSessionId(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-card-border bg-card px-4 py-4 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("cashier.route_label", locale)}
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              {restaurantName}
            </h1>
            {staffName && (
              <p className="text-sm text-muted-foreground">{staffName}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RoleBadge role={StaffRole.CASHIER} locale={locale} />
            <LanguageToggle locale={locale} onChange={setLocale} />
          </div>
        </div>
      </header>

      <div className="grid gap-6 p-4 lg:grid-cols-[280px_1fr_300px] lg:p-6">
        <aside>
          <h2 className="mb-3 text-lg font-semibold">
            {t("cashier.sessions", locale)}
          </h2>
          {loading && (
            <p className="text-muted-foreground">{t("common.loading", locale)}</p>
          )}
          {error && (
            <p className="text-danger">{t("cashier.load_error", locale)}</p>
          )}
          {!loading && !error && sessions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("cashier.sessions_empty", locale)}
            </p>
          )}
          <SessionList
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            currency={currency}
            locale={locale}
            onSelect={setSelectedSessionId}
          />
        </aside>

        <main>
          {selectedSessionId ? (
            <BillDetail
              bill={bill}
              loading={billLoading}
              locale={locale}
              onRefresh={handleRefreshAll}
            />
          ) : (
            <p className="text-center text-muted-foreground">
              {t("cashier.select_session", locale)}
            </p>
          )}
        </main>

        <aside>
          <VerificationQueue
            items={verificationItems}
            loading={verificationLoading}
            currency={currency}
            locale={locale}
            onVerify={handleVerify}
          />
        </aside>
      </div>
    </div>
  );
}
