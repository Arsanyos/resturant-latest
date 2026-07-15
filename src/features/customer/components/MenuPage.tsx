"use client";

import { useCallback, useMemo, useState } from "react";
import type { SupportedLocale } from "@/lib/i18n";
import type { BootstrapData, CartItem, MenuItem } from "../types";
import { CategoryTabs } from "./CategoryTabs";
import { MenuItemCard } from "./MenuItemCard";
import { ItemDrawer } from "./ItemDrawer";

export function MenuPage({
  data,
  locale,
  onAddToCart,
  onUpdateCartItem,
  editingCartItem,
  onClearEditing,
}: {
  data: BootstrapData;
  locale: SupportedLocale;
  onAddToCart: Parameters<typeof ItemDrawer>[0]["onAdd"];
  onUpdateCartItem?: (localId: string, next: CartItem) => void;
  editingCartItem?: CartItem | null;
  onClearEditing?: () => void;
}) {
  const [activeCategoryId, setActiveCategoryId] = useState(
    data.menu[0]?.id ?? ""
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const activeCategory = useMemo(
    () => data.menu.find((c) => c.id === activeCategoryId) ?? data.menu[0],
    [data.menu, activeCategoryId]
  );

  const drawerItem =
    editingCartItem &&
    data.menu
      .flatMap((c) => c.items)
      .find((i) => i.id === editingCartItem.menuItemId);

  const quickAddToCart = useCallback(
    (item: MenuItem) => {
      if (!item.available) return;
      const needsOptions =
        item.variants.length > 0 || item.modifiers.length > 0;
      if (needsOptions) {
        setSelectedItem(item);
        return;
      }
      onAddToCart({
        menuItem: item,
        modifiers: [],
        quantity: 1,
      });
    },
    [onAddToCart]
  );

  return (
    <div className="space-y-4">
      <CategoryTabs
        categories={data.menu}
        activeId={activeCategory?.id ?? activeCategoryId}
        onChange={setActiveCategoryId}
        locale={locale}
      />

      <div className="space-y-3">
        {activeCategory?.items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            currency={data.restaurant.currency}
            locale={locale}
            onSelect={setSelectedItem}
            onAddToCart={quickAddToCart}
          />
        ))}
      </div>

      {(selectedItem || drawerItem) && (
        <ItemDrawer
          item={drawerItem ?? selectedItem}
          currency={data.restaurant.currency}
          locale={locale}
          initialCartItem={editingCartItem}
          onClose={() => {
            setSelectedItem(null);
            onClearEditing?.();
          }}
          onAdd={onAddToCart}
          onUpdate={onUpdateCartItem}
        />
      )}
    </div>
  );
}
