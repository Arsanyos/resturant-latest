"use client";

import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";
import { t, type SupportedLocale } from "@/lib/i18n";
import type { VerificationQueueItem } from "../types";

export function VerificationQueue({
  items,
  loading,
  currency,
  locale,
  onVerify,
}: {
  items: VerificationQueueItem[];
  loading: boolean;
  currency: string;
  locale: SupportedLocale;
  onVerify: (transactionId: string, verified: boolean) => Promise<void>;
}) {
  return (
    <AppCard>
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        {t("cashier.verification_title", locale)}
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        {t("cashier.verification_note", locale)}
      </p>

      {loading && (
        <p className="text-sm text-muted-foreground">
          {t("common.loading", locale)}
        </p>
      )}

      {!loading && items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("cashier.verification_empty", locale)}
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.transactionId}
            className="rounded-lg border border-card-border p-3 text-sm"
          >
            <p className="font-medium">
              {t("customer.table", locale)} {item.tableNumber} — {item.tableLabel}
            </p>
            <p className="text-muted-foreground">{item.telebirrRef}</p>
            <p className="mt-1">
              <Money amount={item.amount} currency={currency} />
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void onVerify(item.transactionId, true)}
                className="rounded-pill bg-success px-3 py-1 text-xs text-white"
              >
                {t("cashier.mark_verified", locale)}
              </button>
              <button
                type="button"
                onClick={() => void onVerify(item.transactionId, false)}
                className="rounded-pill border border-card-border px-3 py-1 text-xs"
              >
                {t("cashier.mark_failed", locale)}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </AppCard>
  );
}
