"use client";

import { useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";
import { t, type SupportedLocale } from "@/lib/i18n";

const USSD_DELAY_MS = 1500;

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ussdSent, setUssdSent] = useState(false);

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

  const payAmount = payment.balance > 0 ? payment.balance : payment.totalDue;

  async function handleTelebirrPay() {
    if (!sessionId || !payment) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    setUssdSent(true);

    await new Promise((resolve) => setTimeout(resolve, USSD_DELAY_MS));

    const billRef = `BOLE-${Date.now()}`;

    try {
      const token = getToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["x-device-token"] = token;

      const response = await fetch("/api/payments/telebirr/mock", {
        method: "POST",
        headers,
        body: JSON.stringify({
          paymentId: payment.id,
          amount: payAmount,
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
      setUssdSent(false);
    }
  }

  function openConfirm() {
    setError(null);
    setMessage(null);
    setConfirmOpen(true);
  }

  function confirmAndPay() {
    setConfirmOpen(false);
    void handleTelebirrPay();
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
              disabled={loading}
            />
            {t("customer.pay_simulate_failure", locale)}
          </label>

          <button
            type="button"
            disabled={loading}
            onClick={openConfirm}
            className="w-full rounded-pill bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading
              ? t("common.loading", locale)
              : t("customer.pay_telebirr", locale)}
          </button>

          {ussdSent ? (
            <p className="text-center text-sm font-medium text-primary">
              {t("customer.pay_ussd_sent", locale)}
            </p>
          ) : null}

          {message && (
            <p className="text-center text-sm text-warning">{message}</p>
          )}
          {error && (
            <p className="text-center text-sm text-danger">{error}</p>
          )}
        </AppCard>
      )}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <AppCard className="w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground">
              {t("customer.pay_confirm_title", locale)}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("customer.pay_confirm_body", locale)}
            </p>
            <p className="mt-3 text-2xl font-bold text-foreground">
              <Money amount={payAmount} currency={currency} />
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("customer.pay_confirm_hint", locale)}
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-pill border border-card-border px-4 py-2.5 text-sm font-medium"
              >
                {t("customer.pay_confirm_cancel", locale)}
              </button>
              <button
                type="button"
                onClick={confirmAndPay}
                className="flex-1 rounded-pill bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {t("customer.pay_confirm_proceed", locale)}
              </button>
            </div>
          </AppCard>
        </div>
      ) : null}
    </div>
  );
}
