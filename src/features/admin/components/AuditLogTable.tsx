"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  actorName: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export function AuditLogTable({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (action) params.set("action", action);
    const res = await fetch(
      `/api/restaurants/${slug}/admin/audit-log?${params.toString()}`
    );
    if (res.ok) {
      const json = await res.json();
      setEntries(json.entries ?? []);
    }
    setLoading(false);
  }, [slug, action]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{t("admin.audit_log", locale)}</h2>
      <div className="mb-4 flex gap-2">
        <input
          className="rounded-lg border border-card-border px-3 py-2 text-sm"
          placeholder={t("admin.filter_action", locale)}
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <button
          type="button"
          onClick={() => load()}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          {t("admin.filter", locale)}
        </button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">{t("admin.loading", locale)}</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <AppCard key={entry.id}>
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">{entry.action}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.actorName ?? "—"} · {entry.entityType}
                  </p>
                </div>
                <time className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
              </div>
              {Object.keys(entry.payload).length > 0 ? (
                <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(entry.payload, null, 2)}
                </pre>
              ) : null}
            </AppCard>
          ))}
        </div>
      )}
    </div>
  );
}
