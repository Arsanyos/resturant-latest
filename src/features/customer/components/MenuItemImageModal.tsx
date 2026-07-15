"use client";

import { useEffect } from "react";
import { Money } from "@/components/shared/Money";
import { t, type SupportedLocale } from "@/lib/i18n";
import type { MenuItem } from "../types";
import { computeLineUnitPrice } from "../utils/cart-total";

export function MenuItemImageModal({
  item,
  currency,
  locale,
  onClose,
  onAddToCart,
}: {
  item: MenuItem;
  currency: string;
  locale: SupportedLocale;
  onClose: () => void;
  onAddToCart: (item: MenuItem) => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const variant = item.variants[0];
  const unitPrice = computeLineUnitPrice(
    item.basePrice,
    variant?.priceDelta ?? 0,
    []
  );

  function handleAddToCart() {
    onAddToCart(item);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-item-image-title"
        className="relative w-full max-w-md overflow-hidden rounded-card bg-card shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="aspect-[4/3] w-full bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="space-y-2 px-5 py-4">
          <h2
            id="menu-item-image-title"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            {item.name}
          </h2>
          {item.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          ) : null}
          <p className="pt-1 text-lg font-semibold text-foreground">
            <Money amount={unitPrice} currency={currency} />
          </p>

          <button
            type="button"
            onClick={handleAddToCart}
            className="mt-3 w-full rounded-pill bg-primary py-3 font-medium text-primary-foreground"
          >
            {t("customer.add_to_cart", locale)} —{" "}
            <Money amount={unitPrice} currency={currency} />
          </button>
        </div>
      </div>
    </div>
  );
}
