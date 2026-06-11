"use client";

import { Money } from "@/components/shared/Money";
import { t, type SupportedLocale } from "@/lib/i18n";
import type { MenuItem } from "../types";

export function MenuItemCard({
  item,
  currency,
  locale,
  onSelect,
}: {
  item: MenuItem;
  currency: string;
  locale: SupportedLocale;
  onSelect: (item: MenuItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="flex w-full items-start gap-3 rounded-card border border-card-border bg-card p-4 text-left transition hover:shadow-sm"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">
          {t(item.nameI18nKey, locale)}
        </p>
        {item.descriptionI18nKey && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {t(item.descriptionI18nKey, locale)}
          </p>
        )}
        <div className="mt-2">
          <Money amount={item.basePrice} currency={currency} className="text-sm font-semibold" />
        </div>
      </div>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground"
        aria-hidden
      >
        +
      </div>
    </button>
  );
}
