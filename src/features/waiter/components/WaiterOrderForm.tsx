"use client";

import { useMemo, useState } from "react";
import { CategoryTabs } from "@/features/customer/components/CategoryTabs";
import { ItemDrawer } from "@/features/customer/components/ItemDrawer";
import { MenuItemCard } from "@/features/customer/components/MenuItemCard";
import { useCart } from "@/features/customer/hooks/use-cart";
import type { MenuItem } from "@/features/customer/types";
import { Money } from "@/components/shared/Money";
import { t, type SupportedLocale } from "@/lib/i18n";
import type { WaiterMenuData } from "../types";

export function WaiterOrderForm({
  menuData,
  sessionId,
  locale,
  onOrderPlaced,
}: {
  menuData: WaiterMenuData;
  sessionId: string;
  locale: SupportedLocale;
  onOrderPlaced: () => void;
}) {
  const cart = useCart();
  const [activeCategoryId, setActiveCategoryId] = useState(
    menuData.menu[0]?.id ?? ""
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const activeCategory = useMemo(
    () =>
      menuData.menu.find((c) => c.id === activeCategoryId) ?? menuData.menu[0],
    [menuData.menu, activeCategoryId]
  );

  const cartTotal = cart.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  async function handlePlaceOrder() {
    if (cart.items.length === 0) return;
    setPlacing(true);
    setPlaceError(null);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map((item) => ({
            menuItemId: item.menuItemId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            modifiers: item.modifiers,
            notes: item.notes,
          })),
        }),
      });
      if (!response.ok) throw new Error("place_failed");
      cart.clearCart();
      onOrderPlaced();
    } catch {
      setPlaceError(t("customer.order_failed", locale));
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-4 border-t border-card-border pt-4">
      <h3 className="font-semibold text-foreground">
        {t("waiter.place_order", locale)}
      </h3>

      <CategoryTabs
        categories={menuData.menu}
        activeId={activeCategory?.id ?? activeCategoryId}
        onChange={setActiveCategoryId}
        locale={locale}
      />

      <div className="max-h-48 space-y-2 overflow-y-auto">
        {activeCategory?.items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            currency={menuData.currency}
            locale={locale}
            onSelect={setSelectedItem}
          />
        ))}
      </div>

      {cart.items.length > 0 && (
        <div className="rounded-lg border border-card-border bg-background p-3">
          <p className="mb-2 text-sm font-medium">
            {t("customer.tab.cart", locale)} ({cart.itemCount})
          </p>
          <ul className="mb-3 space-y-1 text-sm">
            {cart.items.map((item) => (
              <li key={item.localId} className="flex justify-between gap-2">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <Money
                  amount={item.unitPrice * item.quantity}
                  currency={menuData.currency}
                />
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-card-border pt-2">
            <Money amount={cartTotal} currency={menuData.currency} />
            <button
              type="button"
              onClick={() => void handlePlaceOrder()}
              disabled={placing}
              className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {placing
                ? t("common.loading", locale)
                : t("customer.place_order", locale)}
            </button>
          </div>
          {placeError && (
            <p className="mt-2 text-sm text-danger">{placeError}</p>
          )}
        </div>
      )}

      {selectedItem && (
        <ItemDrawer
          item={selectedItem}
          currency={menuData.currency}
          locale={locale}
          onClose={() => setSelectedItem(null)}
          onAdd={(payload) => {
            cart.addItem(payload);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}
