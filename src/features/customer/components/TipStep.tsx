"use client";

import { useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";
import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const USSD_DELAY_MS = 1500;

type Preset = { key: string; amount: number };

function buildPresets(subtotal: number): Preset[] {
  const pct = Math.round(subtotal * 0.1);
  return [
    { key: "50", amount: 50 },
    { key: "100", amount: 100 },
    ...(pct > 0 ? [{ key: "pct", amount: pct }] : []),
  ];
}

export function TipStep({
  sessionId,
  subtotal,
  currency,
  locale,
  canTip = true,
  unavailableMessage,
  onComplete,
}: {
  sessionId: string;
  subtotal: number;
  currency: string;
  locale: SupportedLocale;
  canTip?: boolean;
  unavailableMessage?: string | null;
  onComplete: () => void;
}) {
  const presets = buildPresets(subtotal);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ussdSent, setUssdSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const tipAmount =
    selectedAmount ??
    (customAmount ? Number(customAmount) : null);

  async function submitTip() {
    if (!tipAmount || tipAmount <= 0) return;
    setLoading(true);
    setError(null);
    setUssdSent(true);

    await new Promise((resolve) => setTimeout(resolve, USSD_DELAY_MS));

    try {
      const response = await fetch("/api/tips/telebirr/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          amount: tipAmount,
          billRefNumber: `TIP-${Date.now()}`,
        }),
      });

      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? "Tip failed");
      }

      setSuccess(true);
      setTimeout(onComplete, 2000);
    } catch {
      setError(t("customer.tip_failed", locale));
    } finally {
      setLoading(false);
      setUssdSent(false);
      setConfirmOpen(false);
    }
  }

  if (success) {
    return (
      <AppCard className="text-center">
        <p className="font-medium text-success">
          {t("customer.tip_thank_you", locale)}
        </p>
      </AppCard>
    );
  }

  if (!canTip) {
    return (
      <AppCard className="space-y-4 text-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {t("customer.tip_title", locale)}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {unavailableMessage ?? t("customer.tip_no_server", locale)}
          </p>
        </div>
        <button
          type="button"
          onClick={onComplete}
          className="w-full rounded-pill bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {t("customer.pay_thank_you", locale)}
        </button>
      </AppCard>
    );
  }

  return (
    <AppCard className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          {t("customer.tip_title", locale)}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("customer.tip_subtitle", locale)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            disabled={loading}
            onClick={() => {
              setSelectedAmount(preset.amount);
              setCustomAmount("");
            }}
            className={cn(
              "rounded-pill border px-4 py-2 text-sm font-medium transition",
              selectedAmount === preset.amount && !customAmount
                ? "border-primary bg-primary text-primary-foreground"
                : "border-card-border hover:bg-muted"
            )}
          >
            {preset.key === "pct" ? (
              <>
                10% · <Money amount={preset.amount} currency={currency} />
              </>
            ) : (
              <Money amount={preset.amount} currency={currency} />
            )}
          </button>
        ))}
      </div>

      <label className="block text-sm">
        <span className="text-muted-foreground">
          {t("customer.tip_custom", locale)}
        </span>
        <input
          type="number"
          min="1"
          step="any"
          disabled={loading}
          className="mt-1 w-full rounded-lg border border-card-border px-3 py-2 text-sm"
          placeholder="0"
          value={customAmount}
          onChange={(e) => {
            setCustomAmount(e.target.value);
            setSelectedAmount(null);
          }}
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onComplete}
          className="flex-1 rounded-pill border border-card-border px-4 py-2.5 text-sm font-medium"
        >
          {t("customer.tip_skip", locale)}
        </button>
        <button
          type="button"
          disabled={loading || !tipAmount || tipAmount <= 0}
          onClick={() => setConfirmOpen(true)}
          className="flex-1 rounded-pill bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading
            ? t("common.loading", locale)
            : t("customer.tip_send", locale)}
        </button>
      </div>

      {ussdSent ? (
        <p className="text-center text-sm font-medium text-primary">
          {t("customer.pay_ussd_sent", locale)}
        </p>
      ) : null}

      {error ? (
        <p className="text-center text-sm text-danger">{error}</p>
      ) : null}

      {confirmOpen && tipAmount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <AppCard className="w-full max-w-sm">
            <h3 className="text-lg font-semibold">
              {t("customer.tip_confirm_title", locale)}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("customer.tip_confirm_body", locale)}
            </p>
            <p className="mt-3 text-2xl font-bold">
              <Money amount={tipAmount} currency={currency} />
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-pill border border-card-border px-4 py-2.5 text-sm"
              >
                {t("customer.pay_confirm_cancel", locale)}
              </button>
              <button
                type="button"
                onClick={() => void submitTip()}
                className="flex-1 rounded-pill bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {t("customer.tip_confirm_proceed", locale)}
              </button>
            </div>
          </AppCard>
        </div>
      ) : null}
    </AppCard>
  );
}
