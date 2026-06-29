"use client";

import { useEffect, useMemo, useState } from "react";
import { Money } from "@/components/shared/Money";
import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CartItem, MenuItem } from "../types";
import { computeLineUnitPrice } from "../utils/cart-total";

export function ItemDrawer({
  item,
  currency,
  locale,
  initialCartItem,
  onClose,
  onAdd,
  onUpdate,
}: {
  item: MenuItem | null;
  currency: string;
  locale: SupportedLocale;
  initialCartItem?: CartItem | null;
  onClose: () => void;
  onAdd: (payload: {
    menuItem: MenuItem;
    variantId?: string;
    variantNameI18nKey?: string;
    variantDelta?: number;
    modifiers: CartItem["modifiers"];
    notes?: string;
    quantity: number;
  }) => void;
  onUpdate?: (localId: string, next: CartItem) => void;
}) {
  const [variantId, setVariantId] = useState<string | undefined>();
  const [selectedModifiers, setSelectedModifiers] = useState<Set<string>>(
    new Set()
  );
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!item) return;
    if (initialCartItem) {
      setVariantId(initialCartItem.variantId);
      setSelectedModifiers(
        new Set(initialCartItem.modifiers.map((m) => m.modifierId))
      );
      setNotes(initialCartItem.notes ?? "");
      setQuantity(initialCartItem.quantity);
    } else {
      setVariantId(item.variants[0]?.id);
      setSelectedModifiers(new Set());
      setNotes("");
      setQuantity(1);
    }
  }, [item, initialCartItem]);

  const unitPrice = useMemo(() => {
    if (!item) return 0;
    const variant = item.variants.find((v) => v.id === variantId);
    const mods = item.modifiers
      .filter((m) => selectedModifiers.has(m.id))
      .map((m) => m.priceDelta);
    return computeLineUnitPrice(item.basePrice, variant?.priceDelta ?? 0, mods);
  }, [item, variantId, selectedModifiers]);

  if (!item) return null;

  function toggleModifier(id: string) {
    setSelectedModifiers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    const variant = item!.variants.find((v) => v.id === variantId);
    const modifiers = item!.modifiers
      .filter((m) => selectedModifiers.has(m.id))
      .map((m) => ({
        modifierId: m.id,
        nameI18nKey: m.nameI18nKey,
        priceDelta: m.priceDelta,
      }));

    const payload = {
      menuItem: item!,
      variantId: variant?.id,
      variantNameI18nKey: variant?.nameI18nKey,
      variantDelta: variant?.priceDelta ?? 0,
      modifiers,
      notes: notes.trim() || undefined,
      quantity,
    };

    if (initialCartItem && onUpdate) {
      onUpdate(initialCartItem.localId, {
        ...initialCartItem,
        variantId: variant?.id,
        variantNameI18nKey: variant?.nameI18nKey,
        modifiers,
        notes: notes.trim() || undefined,
        quantity,
        unitPrice,
      });
    } else {
      onAdd(payload);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-card border border-card-border bg-card sm:rounded-card">
        <div className="flex items-start justify-between border-b border-card-border p-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">{item.name}</h2>
            {item.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {item.variants.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                {t("customer.size", locale)}
              </p>
              <div className="space-y-2">
                {item.variants.map((variant) => (
                  <label
                    key={variant.id}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2",
                      variantId === variant.id
                        ? "border-primary bg-primary/5"
                        : "border-card-border"
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="variant"
                        checked={variantId === variant.id}
                        onChange={() => setVariantId(variant.id)}
                      />
                      {t(variant.nameI18nKey, locale)}
                    </span>
                    {variant.priceDelta > 0 && (
                      <Money amount={variant.priceDelta} currency={currency} className="text-xs" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {item.modifiers.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                {t("customer.add_ons", locale)}
              </p>
              <div className="space-y-2">
                {item.modifiers.map((modifier) => (
                  <label
                    key={modifier.id}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-card-border px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedModifiers.has(modifier.id)}
                        onChange={() => toggleModifier(modifier.id)}
                      />
                      {t(modifier.nameI18nKey, locale)}
                    </span>
                    <Money amount={modifier.priceDelta} currency={currency} className="text-xs" />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="notes" className="mb-2 block text-sm font-medium text-foreground">
              {t("customer.special_instructions", locale)}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder={t("customer.notes_placeholder", locale)}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {t("customer.quantity", locale)}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-card-border"
              >
                −
              </button>
              <span className="w-6 text-center font-medium">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-card-border"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-card-border p-4">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-pill bg-primary py-3 font-medium text-primary-foreground"
          >
            {initialCartItem ? t("customer.update_cart", locale) : t("customer.add_to_cart", locale)}{" "}
            — <Money amount={unitPrice * quantity} currency={currency} />
          </button>
        </div>
      </div>
    </div>
  );
}
