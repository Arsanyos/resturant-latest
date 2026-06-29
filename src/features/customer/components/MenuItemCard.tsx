"use client";

import { Money } from "@/components/shared/Money";
import type { MenuItem } from "../types";

export function MenuItemCard({
  item,
  currency,
  onSelect,
}: {
  item: MenuItem;
  currency: string;
  locale?: string;
  onSelect: (item: MenuItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="flex w-full items-start gap-3 rounded-card border border-card-border bg-card p-4 text-left transition hover:shadow-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl}
        alt=""
        className="h-16 w-16 shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{item.name}</p>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {item.description}
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
