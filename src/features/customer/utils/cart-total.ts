import { computeTotals } from "@/lib/money";
import type { CartItem } from "../types";

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function cartTotals(
  items: CartItem[],
  taxPct: number,
  servicePct: number
) {
  const subtotal = cartSubtotal(items);
  return computeTotals(subtotal, taxPct, servicePct);
}

export function computeLineUnitPrice(
  basePrice: number,
  variantDelta = 0,
  modifierDeltas: number[] = []
): number {
  return basePrice + variantDelta + modifierDeltas.reduce((a, b) => a + b, 0);
}
