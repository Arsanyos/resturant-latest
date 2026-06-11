"use client";

import { useState } from "react";
import { t, type SupportedLocale } from "@/lib/i18n";

export function CashPaymentForm({
  paymentId,
  balance,
  locale,
  onRecorded,
}: {
  paymentId: string;
  balance: number;
  locale: SupportedLocale;
  onRecorded: () => void;
}) {
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : "");
  const [cashTendered, setCashTendered] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          amount: Number(amount),
          cashTendered: Number(cashTendered || amount),
        }),
      });
      if (!response.ok) {
        const json = (await response.json()) as { error?: string };
        throw new Error(json.error ?? "Failed");
      }
      onRecorded();
      setAmount("");
      setCashTendered("");
    } catch {
      setError(t("cashier.cash_failed", locale));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        {t("cashier.record_cash", locale)}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          {t("cashier.amount", locale)}
          <input
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-card-border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          {t("cashier.cash_tendered", locale)}
          <input
            type="number"
            min={1}
            step={1}
            value={cashTendered}
            onChange={(e) => setCashTendered(e.target.value)}
            placeholder={amount}
            className="mt-1 w-full rounded-lg border border-card-border px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={loading || !amount}
        className="w-full rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {loading ? t("common.loading", locale) : t("cashier.record_cash", locale)}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
