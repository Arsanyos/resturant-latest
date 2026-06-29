"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";
import { QrGenerator } from "./QrGenerator";

type Table = {
  id: string;
  number: number;
  label: string;
  capacity: number;
  isActive: boolean;
};

export function TableManager({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState("4");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tables");
    if (res.ok) {
      const json = await res.json();
      setTables(json.tables ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTable() {
    if (!label) return;
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, capacity: Number(capacity) }),
    });
    setLabel("");
    await load();
  }

  async function toggleActive(table: Table) {
    await fetch(`/api/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !table.isActive }),
    });
    await load();
  }

  if (loading) {
    return <p className="text-muted-foreground">{t("admin.loading", locale)}</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t("admin.tables", locale)}</h2>

      <AppCard>
        <h3 className="mb-3 font-medium">{t("admin.create_table", locale)}</h3>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            placeholder={t("admin.table_label", locale)}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            type="number"
            className="w-20 rounded-lg border border-card-border px-3 py-2 text-sm"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
          <button
            type="button"
            onClick={() => createTable()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            {t("admin.save", locale)}
          </button>
        </div>
      </AppCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {tables.map((table) => (
          <div key={table.id} className="space-y-2">
            <AppCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {t("admin.table", locale)} {table.number} — {table.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {table.capacity} {t("admin.seats", locale)} ·{" "}
                    {table.isActive
                      ? t("admin.active", locale)
                      : t("admin.inactive", locale)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleActive(table)}
                  className="rounded-lg border border-card-border px-3 py-1 text-sm"
                >
                  {table.isActive
                    ? t("admin.disable_item", locale)
                    : t("admin.enable_item", locale)}
                </button>
              </div>
            </AppCard>
            {table.isActive ? (
              <QrGenerator
                slug={slug}
                tableNumber={table.number}
                label={table.label}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
