"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppCard } from "@/components/shared/AppCard";

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  tenantType: string;
  onboardingStatus: string;
  isActive: boolean;
  currency: string;
  subscriptionPlan: string | null;
  staffCount: number;
  tableCount: number;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-success/15 text-success",
  DRAFT: "bg-muted text-muted-foreground",
  SUSPENDED: "bg-destructive/15 text-destructive",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export function TenantTable() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/tenants");
      if (!res.ok) throw new Error("Failed to load tenants");
      const json = await res.json();
      setTenants(json.tenants ?? []);
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
    return <p className="text-muted-foreground">Loading tenants...</p>;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tenants</h2>
        <Link
          href="/platform/tenants/new"
          className="rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Create tenant
        </Link>
      </div>

      {tenants.length === 0 ? (
        <AppCard>
          <p className="text-sm text-muted-foreground">
            No tenants yet. Create your first one.
          </p>
        </AppCard>
      ) : (
        <div className="space-y-2">
          {tenants.map((tenant) => (
            <Link key={tenant.id} href={`/platform/tenants/${tenant.id}`}>
              <AppCard className="transition hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {tenant.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        /r/{tenant.slug} · {tenant.tenantType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {tenant.tableCount} tables · {tenant.staffCount} staff
                    </span>
                    <span
                      className={`rounded-pill px-3 py-1 text-xs font-medium ${
                        STATUS_STYLES[tenant.onboardingStatus] ??
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tenant.onboardingStatus}
                    </span>
                  </div>
                </div>
              </AppCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
