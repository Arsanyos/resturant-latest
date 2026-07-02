"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/shared/AppCard";

type HealthData = {
  database: string;
  app: string;
  activeTenants24h: number;
  generatedAt: string;
};

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        ok ? "bg-success" : "bg-destructive"
      }`}
    />
  );
}

export function SystemHealth() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/system/health");
      if (!res.ok) throw new Error("Failed to load system health");
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
    return <p className="text-muted-foreground">Loading system health...</p>;
  }

  if (error || !data) {
    return <p className="text-destructive">{error ?? "Failed to load"}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">System Health</h2>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-lg border border-card-border px-3 py-1.5 text-sm text-foreground transition hover:bg-muted"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AppCard>
          <div className="flex items-center gap-2">
            <StatusDot ok={data.database === "ok"} />
            <p className="text-sm text-muted-foreground">Database</p>
          </div>
          <p className="mt-1 text-2xl font-bold capitalize">{data.database}</p>
        </AppCard>
        <AppCard>
          <div className="flex items-center gap-2">
            <StatusDot ok={data.app === "ok"} />
            <p className="text-sm text-muted-foreground">Application</p>
          </div>
          <p className="mt-1 text-2xl font-bold capitalize">{data.app}</p>
        </AppCard>
        <AppCard>
          <p className="text-sm text-muted-foreground">
            Active tenants (24h)
          </p>
          <p className="mt-1 text-2xl font-bold">{data.activeTenants24h}</p>
        </AppCard>
      </div>

      <p className="text-xs text-muted-foreground">
        Generated at {new Date(data.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
