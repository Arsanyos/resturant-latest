"use client";

import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";
import { t, type SupportedLocale } from "@/lib/i18n";
import type { CartItem } from "../types";
import { cartTotals } from "../utils/cart-total";

export function CartView({
  items,
  currency,
  locale,
  taxPct,
  servicePct,
  isOpen,
  placing,
  onEdit,
  onRemove,
  onPlaceOrder,
}: {
  items: CartItem[];
  currency: string;
  locale: SupportedLocale;
  taxPct: number;
  servicePct: number;
  isOpen: boolean;
  placing: boolean;
  onEdit: (item: CartItem) => void;
  onRemove: (localId: string) => void;
  onPlaceOrder: () => void;
}) {
  const totals = cartTotals(items, taxPct, servicePct);

  if (items.length === 0) {
    return (
      <AppCard className="text-center text-muted-foreground">
        {t("customer.cart_empty", locale)}
      </AppCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((item) => (
          <AppCard key={item.localId}>
            <div className="flex items-start justify-between gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  {item.name}
                  {item.variantNameI18nKey && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {t(item.variantNameI18nKey, locale)}
                    </span>
                  )}
                </p>
                {item.modifiers.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.modifiers.map((m) => t(m.nameI18nKey, locale)).join(", ")}
                  </p>
                )}
                {item.notes && (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    {item.notes}
                  </p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  × {item.quantity}
                </p>
              </div>
              <Money
                amount={item.unitPrice * item.quantity}
                currency={currency}
                className="shrink-0 self-start text-sm font-semibold"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="text-xs font-medium text-primary"
              >
                {t("customer.edit", locale)}
              </button>
              <button
                type="button"
                onClick={() => onRemove(item.localId)}
                className="text-xs font-medium text-danger"
              >
                {t("customer.remove", locale)}
              </button>
            </div>
          </AppCard>
        ))}
      </div>

      <AppCard className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("customer.subtotal", locale)}</span>
          <Money amount={totals.subtotal} currency={currency} />
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("customer.service", locale)}</span>
          <Money amount={totals.serviceCharge} currency={currency} />
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("customer.vat", locale)}</span>
          <Money amount={totals.tax} currency={currency} />
        </div>
        <div className="flex justify-between border-t border-card-border pt-2 font-semibold text-foreground">
          <span>{t("customer.estimated_total", locale)}</span>
          <Money amount={totals.totalDue} currency={currency} />
        </div>
      </AppCard>

      {!isOpen && (
        <p className="text-center text-sm text-warning">
          {t("customer.closed_no_order", locale)}
        </p>
      )}

      <button
        type="button"
        disabled={!isOpen || placing}
        onClick={onPlaceOrder}
        className="w-full rounded-pill bg-primary py-3 font-medium text-primary-foreground disabled:opacity-60"
      >
        {placing ? t("common.loading", locale) : t("customer.place_order", locale)}
      </button>
    </div>
  );
}
