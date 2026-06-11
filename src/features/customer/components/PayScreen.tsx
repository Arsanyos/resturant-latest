"use client";

import { useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";
import { t, type SupportedLocale } from "@/lib/i18n";

export function PayScreen({
  payment,
  currency,
  locale,
  canPay,
  sessionId,
  getToken,
  onSessionClosed,
}: {
  payment: {
    id: string;
    subtotal: number;
    serviceCharge: number;
    tax: number;
    totalDue: number;
    totalPaid: number;
    balance: number;
    status: string;
  } | null;
  currency: string;
  locale: SupportedLocale;
  canPay: boolean;
  sessionId: string | null;
  getToken: () => string | null;
  onSessionClosed?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  if (!payment) {
    return (
      <AppCard className="text-center text-muted-foreground">
        {t("customer.pay_no_bill", locale)}
      </AppCard>
    );
  }

  if (paid || payment.status === "PAID") {
    return (
      <AppCard className="text-center">
        <p className="font-medium text-success">
          {t("customer.pay_success", locale)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("customer.pay_thank_you", locale)}
        </p>
      </AppCard>
    );
  }

  async function handleTelebirrPay() {
    if (!sessionId || !payment) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    const billRef = `BOLE-${Date.now()}`;
    const amount = payment.balance > 0 ? payment.balance : payment.totalDue;

    try {
      const token = getToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["x-device-token"] = token;

      const response = await fetch("/api/payments/telebirr/mock", {
        method: "POST",
        headers,
        body: JSON.stringify({
          paymentId: payment.id,
          amount,
          billRefNumber: billRef,
          simulateFailure,
        }),
      });

      const json = (await response.json()) as {
        success?: boolean;
        sessionClosed?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error ?? "Payment failed");
      }

      if (json.success && json.sessionClosed) {
        setPaid(true);
        onSessionClosed?.();
      } else if (json.success) {
        setMessage(t("customer.pay_partial_telebirr", locale));
      } else {
        setMessage(t("customer.pay_telebirr_pending", locale));
      }
    } catch {
      setError(t("customer.pay_failed", locale));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <AppCard className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {t("customer.subtotal", locale)}
          </span>
          <Money amount={payment.subtotal} currency={currency} />
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {t("customer.service", locale)}
          </span>
          <Money amount={payment.serviceCharge} currency={currency} />
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("customer.vat", locale)}</span>
          <Money amount={payment.tax} currency={currency} />
        </div>
        <div className="flex justify-between border-t border-card-border pt-2 text-base font-semibold text-foreground">
          <span>{t("customer.total_due", locale)}</span>
          <Money amount={payment.totalDue} currency={currency} />
        </div>
        {payment.totalPaid > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("cashier.total_paid", locale)}
            </span>
            <Money amount={payment.totalPaid} currency={currency} />
          </div>
        )}
      </AppCard>

      {!canPay ? (
        <AppCard className="text-center">
          <p className="text-sm text-muted-foreground">
            {t("customer.pay_disabled", locale)}
          </p>
        </AppCard>
      ) : (
        <AppCard className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("customer.pay_cash_hint", locale)}
          </p>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.checked)}
            />
            {t("customer.pay_simulate_failure", locale)}
          </label>

          <button
            type="button"
            disabled={loading}
            onClick={() => void handleTelebirrPay()}
            className="w-full rounded-pill bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading
              ? t("common.loading", locale)
              : t("customer.pay_telebirr", locale)}
          </button>

          {message && (
            <p className="text-center text-sm text-warning">{message}</p>
          )}
          {error && (
            <p className="text-center text-sm text-danger">{error}</p>
          )}
        </AppCard>
      )}
    </div>
  );
}
