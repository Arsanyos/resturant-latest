"use client";

import { KitchenStatus } from "@prisma/client";
import { useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";
import { StatusChip } from "@/components/shared/StatusChip";
import { t, type SupportedLocale } from "@/lib/i18n";
import type { SessionBill } from "../types";
import { CashPaymentForm } from "./CashPaymentForm";

export function BillDetail({
  bill,
  loading,
  locale,
  onRefresh,
}: {
  bill: SessionBill | null;
  loading: boolean;
  locale: SupportedLocale;
  onRefresh: () => void;
}) {
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !bill) {
    return (
      <AppCard>
        <p className="text-muted-foreground">{t("common.loading", locale)}</p>
      </AppCard>
    );
  }

  const currency = bill.restaurant.currency;
  const payment = bill.payment;

  async function handleFinalize() {
    if (!payment) return;
    setFinalizing(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      if (!response.ok) throw new Error("Failed");
      onRefresh();
    } catch {
      setError(t("cashier.finalize_failed", locale));
    } finally {
      setFinalizing(false);
    }
  }

  const canFinalize =
    payment && payment.totalPaid + 0.01 >= payment.totalDue;

  return (
    <AppCard className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">
          {t("customer.table", locale)} {bill.table.number} — {bill.table.label}
        </h2>
        <p className="text-xs text-muted-foreground">
          {new Date(bill.session.startedAt).toLocaleString()} ·{" "}
          {bill.session.startedByType}
        </p>
      </div>

      {!bill.canPay && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          {t("cashier.pay_locked", locale)}
        </p>
      )}

      {bill.orders.map((order) => (
        <div key={order.id} className="border-t border-card-border pt-3">
          <p className="mb-2 text-sm font-semibold">
            {t("customer.order_number", locale)} #{order.orderNumber}
          </p>
          <ul className="space-y-2">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <div>
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground">{item.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <StatusChip
                    status={item.kitchenStatus as KitchenStatus}
                    locale={locale}
                  />
                  <p className="mt-1">
                    <Money
                      amount={item.unitPrice * item.quantity}
                      currency={currency}
                    />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {payment && (
        <div className="space-y-1 border-t border-card-border pt-3 text-sm">
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
            <span className="text-muted-foreground">
              {t("customer.vat", locale)}
            </span>
            <Money amount={payment.tax} currency={currency} />
          </div>
          <div className="flex justify-between font-semibold">
            <span>{t("customer.total_due", locale)}</span>
            <Money amount={payment.totalDue} currency={currency} />
          </div>
          <div className="flex justify-between">
            <span>{t("cashier.total_paid", locale)}</span>
            <Money amount={payment.totalPaid} currency={currency} />
          </div>
          <div className="flex justify-between font-semibold text-primary">
            <span>{t("cashier.balance", locale)}</span>
            <Money amount={payment.balance} currency={currency} />
          </div>
        </div>
      )}

      {payment && payment.transactions.length > 0 && (
        <div className="border-t border-card-border pt-3">
          <h3 className="mb-2 text-sm font-semibold">
            {t("cashier.transactions", locale)}
          </h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {payment.transactions.map((txn) => (
              <li key={txn.id} className="flex justify-between">
                <span>
                  {txn.method} · {txn.status}
                  {txn.telebirrRef ? ` · ${txn.telebirrRef}` : ""}
                </span>
                <Money amount={txn.amount} currency={currency} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {bill.canPay && payment && (
        <CashPaymentForm
          paymentId={payment.id}
          balance={payment.balance}
          locale={locale}
          onRecorded={onRefresh}
        />
      )}

      {canFinalize && (
        <button
          type="button"
          onClick={() => void handleFinalize()}
          disabled={finalizing}
          className="w-full rounded-pill bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground disabled:opacity-50"
        >
          {finalizing
            ? t("common.loading", locale)
            : t("cashier.finalize", locale)}
        </button>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </AppCard>
  );
}
