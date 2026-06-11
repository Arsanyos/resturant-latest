"use client";

import { useState } from "react";
import { t, type SupportedLocale } from "@/lib/i18n";

export function SelfAssignButton({
  tableId,
  locale,
  onAssigned,
}: {
  tableId: string;
  locale: SupportedLocale;
  onAssigned: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/staff/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });
      if (!response.ok) {
        const json = (await response.json()) as { error?: string };
        throw new Error(json.error ?? "Failed");
      }
      onAssigned();
    } catch {
      setError(t("waiter.assign_failed", locale));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleAssign()}
        disabled={loading}
        className="w-full rounded-pill bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {loading ? t("common.loading", locale) : t("waiter.self_assign", locale)}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
