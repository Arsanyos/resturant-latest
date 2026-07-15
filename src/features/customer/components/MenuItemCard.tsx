"use client";

import { useState } from "react";
import { AvailabilityPill } from "@/components/shared/AvailabilityPill";
import { Money } from "@/components/shared/Money";
import type { SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
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
  const available = item.available !== false;

  return (
    <>
      <div
        className={cn(
          "flex w-full items-start gap-3 rounded-card border border-card-border bg-card p-4 transition",
          available ? "hover:shadow-sm" : "opacity-70"
        )}
      >
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
        <div className="flex flex-col w-full gap-2">
          <button
            type="button"
            onClick={() => {
              if (!available) return;
              onSelect(item);
            }}
            disabled={!available}
            className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-not-allowed"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{item.name}</p>
              </div>
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
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl font-bold",
                available
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
              aria-hidden
            >
              +
            </div>
          </button>
          <div className="w-full flex justify-end">
            <AvailabilityPill available={available} locale={locale} className="w-fit" />
          </div>
        </div>

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
