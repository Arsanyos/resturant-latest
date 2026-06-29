"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";

type Waiter = { id: string; name: string };

type Table = { id: string; number: number; label: string };

export function ShiftAssignmentForm({ waiters }: { waiters: Waiter[] }) {
  const { locale } = useLocale();
  const [tables, setTables] = useState<Table[]>([]);
  const [staffId, setStaffId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    const res = await fetch("/api/tables");
    if (res.ok) {
      const json = await res.json();
      setTables(json.tables ?? []);
    }
  }, []);

  useEffect(() => {
    void loadTables();
  }, [loadTables]);

  useEffect(() => {
    if (waiters.length && !staffId) {
      setStaffId(waiters[0].id);
    }
  }, [waiters, staffId]);

  function toggleTable(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (!staffId || selected.size === 0) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/staff/assignments/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId,
        tableIds: Array.from(selected),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage(t("admin.assignments_saved", locale));
      setSelected(new Set());
    } else {
      setMessage(t("admin.error", locale));
    }
  }

  return (
    <AppCard>
      <h3 className="mb-3 font-medium">{t("admin.shift_assignments", locale)}</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-card-border px-3 py-2 text-sm"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
        >
          {waiters.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {tables
          .filter((t) => t)
          .map((table) => (
            <label
              key={table.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-card-border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.has(table.id)}
                onChange={() => toggleTable(table.id)}
              />
              {table.number}
            </label>
          ))}
      </div>
      <button
        type="button"
        disabled={saving || selected.size === 0}
        onClick={() => save()}
        className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {t("admin.save_assignments", locale)}
      </button>
      {message ? (
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      ) : null}
    </AppCard>
  );
}
