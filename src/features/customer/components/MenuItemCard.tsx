"use client";

import { useState } from "react";
import { Money } from "@/components/shared/Money";
import type { SupportedLocale } from "@/lib/i18n";
import type { MenuItem } from "../types";
import { MenuItemImageModal } from "./MenuItemImageModal";

export function MenuItemCard({
  item,
  currency,
  locale = "en",
  onSelect,
  onAddToCart,
}: {
  item: MenuItem;
  currency: string;
  locale?: SupportedLocale;
  onSelect: (item: MenuItem) => void;
  onAddToCart: (item: MenuItem) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <div className="flex w-full items-start gap-3 rounded-card border border-card-border bg-card p-4 transition hover:shadow-sm">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="shrink-0 overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`View ${item.name} photo`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt=""
            className="h-16 w-16 object-cover transition hover:opacity-90"
          />
        </button>

        <button
          type="button"
          onClick={() => onSelect(item)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{item.name}</p>
            {item.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            )}
            <div className="mt-2">
              <Money
                amount={item.basePrice}
                currency={currency}
                className="text-sm font-semibold"
              />
            </div>
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground"
            aria-hidden
          >
            +
          </div>
        </button>
      </div>

      {previewOpen ? (
        <MenuItemImageModal
          item={item}
          currency={currency}
          locale={locale}
          onClose={() => setPreviewOpen(false)}
          onAddToCart={onAddToCart}
        />
      ) : null}
    </>
  );
}
