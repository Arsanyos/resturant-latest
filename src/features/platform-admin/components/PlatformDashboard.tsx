"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";

type DashboardData = {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  ordersToday: number;
  revenueToday: number;
  activeSessions: number;
  tenantsWithLowStock: number;
};

export function PlatformDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-muted-foreground">Loading dashboard...</p>;
  }

  if (error || !data) {
    return <p className="text-destructive">{error ?? "Failed to load"}</p>;
  }

  const metrics = [
    { label: "Total tenants", value: data.totalTenants },
    { label: "Active tenants", value: data.activeTenants },
    {
      label: "Suspended tenants",
      value: data.suspendedTenants,
      alert: data.suspendedTenants > 0,
    },
    { label: "Orders today (all)", value: data.ordersToday },
    {
      label: "Revenue today (all)",
      value: <Money amount={data.revenueToday} />,
    },
    { label: "Active sessions", value: data.activeSessions },
    {
      label: "Tenants with low stock",
      value: data.tenantsWithLowStock,
      alert: data.tenantsWithLowStock > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Platform Dashboard</h2>
        <Link
          href="/platform/tenants/new"
          className="rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Create tenant
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <AppCard key={m.label}>
            <p className="text-sm text-muted-foreground">{m.label}</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                m.alert ? "text-destructive" : ""
              }`}
            >
              {m.value}
            </p>
          </AppCard>
        ))}
      </div>
      <Link
        href="/platform/tenants"
        className="inline-block text-sm font-medium text-primary hover:underline"
      >
        View all tenants →
      </Link>
    </div>
  );
}
