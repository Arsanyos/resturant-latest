"use client";

import { useCallback, useState } from "react";
import type { CartItem, MenuItem } from "../types";
import { computeLineUnitPrice } from "../utils/cart-total";

function newLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback(
    (payload: {
      menuItem: MenuItem;
      variantId?: string;
      variantNameI18nKey?: string;
      variantDelta?: number;
      modifiers: CartItem["modifiers"];
      notes?: string;
      quantity: number;
    }) => {
      const unitPrice = computeLineUnitPrice(
        payload.menuItem.basePrice,
        payload.variantDelta ?? 0,
        payload.modifiers.map((m) => m.priceDelta)
      );

      const cartItem: CartItem = {
        localId: newLocalId(),
        menuItemId: payload.menuItem.id,
        name: payload.menuItem.name,
        variantId: payload.variantId,
        variantNameI18nKey: payload.variantNameI18nKey,
        quantity: payload.quantity,
        modifiers: payload.modifiers,
        notes: payload.notes,
        unitPrice,
      };

      setItems((prev) => [...prev, cartItem]);
    },
    []
  );

  const updateItem = useCallback((localId: string, next: CartItem) => {
    setItems((prev) => prev.map((i) => (i.localId === localId ? next : i)));
  }, []);

  const removeItem = useCallback((localId: string) => {
    setItems((prev) => prev.filter((i) => i.localId !== localId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  return { items, addItem, updateItem, removeItem, clearCart, itemCount: items.length };
}
