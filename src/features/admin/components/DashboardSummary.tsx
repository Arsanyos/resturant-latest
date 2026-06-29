"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";

type DashboardData = {
  openSessions: number;
  activeTables: number;
  ordersToday: number;
  revenueToday: number;
  itemsAwaitingKitchen: number;
  lowStockAlerts: number;
};

export function DashboardSummary({
  slug,
  currency,
}: {
  slug: string;
  currency: string;
}) {
  const { locale } = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${slug}/admin/dashboard`);
      if (!res.ok) throw new Error("Failed to load dashboard");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-muted-foreground">{t("admin.loading", locale)}</p>;
  }

  if (error || !data) {
    return (
      <p className="text-destructive">{error ?? t("admin.error", locale)}</p>
    );
  }

  const metrics = [
    { label: t("admin.metric.open_sessions", locale), value: data.openSessions },
    { label: t("admin.metric.active_tables", locale), value: data.activeTables },
    { label: t("admin.metric.orders_today", locale), value: data.ordersToday },
    {
      label: t("admin.metric.revenue_today", locale),
      value: <Money amount={data.revenueToday} currency={currency} />,
    },
    {
      label: t("admin.metric.awaiting_kitchen", locale),
      value: data.itemsAwaitingKitchen,
    },
    {
      label: t("admin.metric.low_stock", locale),
      value: data.lowStockAlerts,
      alert: data.lowStockAlerts > 0,
    },
  ];

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{t("admin.title", locale)}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <AppCard key={m.label}>
            <p className="text-sm text-muted-foreground">{m.label}</p>
            <p
              className={`mt-1 text-2xl font-bold ${m.alert ? "text-destructive" : ""}`}
            >
              {m.value}
            </p>
          </AppCard>
        ))}
      </div>
    </div>
  );
}
