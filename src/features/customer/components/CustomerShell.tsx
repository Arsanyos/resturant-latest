"use client";

import { useState } from "react";
import { RestaurantHeader } from "@/components/shared/RestaurantHeader";
import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCart } from "../hooks/use-cart";
import { useOrders } from "../hooks/use-orders";
import type { BootstrapData, CartItem, CustomerTab } from "../types";
import { allItemsServed, hasOrderItems } from "../utils/order-grouping";
import { CartView } from "./CartView";
import { CustomerAssistanceActions } from "./CustomerAssistanceActions";
import { MenuPage } from "./MenuPage";
import { OrderStatusList } from "./OrderStatusList";
import { PayScreen } from "./PayScreen";

const TABS: CustomerTab[] = ["menu", "cart", "orders", "pay"];

const TAB_KEYS: Record<CustomerTab, string> = {
  menu: "customer.tab.menu",
  cart: "customer.tab.cart",
  orders: "customer.tab.orders",
  pay: "customer.tab.pay",
};

export function CustomerShell({
  data,
  locale,
  onLocaleChange,
  getToken,
  taxPct,
  servicePct,
  readOnly = false,
  onSessionClosed,
}: {
  data: BootstrapData;
  locale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
  getToken: () => string | null;
  taxPct: number;
  servicePct: number;
  readOnly?: boolean;
  onSessionClosed?: () => void;
}) {
  const [tab, setTab] = useState<CustomerTab>("menu");
  const [toast, setToast] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  const cart = useCart();
  const sessionId = data.sessionId;
  const ordersEnabled = !!sessionId && data.sessionState === "active_same_device";

  const { orders, payment, loading: ordersLoading, refresh: refreshOrders } =
    useOrders(sessionId, getToken, ordersEnabled);

  async function handlePlaceOrder() {
    if (!sessionId || cart.items.length === 0) return;

    setPlacing(true);
    try {
      const token = getToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["x-device-token"] = token;

      const response = await fetch(`/api/sessions/${sessionId}/orders`, {
        method: "POST",
        headers,
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

      if (!response.ok) throw new Error("Place order failed");

      cart.clearCart();
      setTab("orders");
      setToast(t("customer.order_placed", locale));
      await refreshOrders();
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast(t("customer.order_failed", locale));
      setTimeout(() => setToast(null), 3000);
    } finally {
      setPlacing(false);
    }
  }

  const canPay =
    hasOrderItems(orders) && allItemsServed(orders) && data.isOpen;

  return (
    <div className="flex min-h-[calc(100vh-1rem)] flex-col">
      <RestaurantHeader
        name={data.restaurant.name}
        tableLabel={data.table.label}
        locale={locale}
        onLocaleChange={onLocaleChange}
      />

      <nav className="sticky top-[65px] z-10 border-b border-card-border bg-background px-2 py-2">
        <div className="flex gap-1">
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "flex-1 rounded-pill px-2 py-2 text-xs font-medium sm:text-sm",
                tab === key
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground"
              )}
            >
              {t(TAB_KEYS[key], locale)}
              {key === "cart" && cart.itemCount > 0 && (
                <span className="ml-1">({cart.itemCount})</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 px-4 py-4">
        {toast && (
          <div className="mb-4 rounded-card border border-success/30 bg-success/10 px-4 py-2 text-center text-sm text-success">
            {toast}
          </div>
        )}

        {tab === "menu" && (
          <MenuPage
            data={data}
            locale={locale}
            onAddToCart={readOnly ? () => {} : cart.addItem}
            onUpdateCartItem={readOnly ? undefined : cart.updateItem}
            editingCartItem={editingItem}
            onClearEditing={() => setEditingItem(null)}
          />
        )}

        {tab === "cart" && !readOnly && (
          <CartView
            items={cart.items}
            currency={data.restaurant.currency}
            locale={locale}
            taxPct={taxPct}
            servicePct={servicePct}
            isOpen={data.isOpen}
            placing={placing}
            onEdit={(item) => {
              setEditingItem(item);
              setTab("menu");
            }}
            onRemove={cart.removeItem}
            onPlaceOrder={() => void handlePlaceOrder()}
          />
        )}

        {tab === "cart" && readOnly && (
          <p className="text-center text-sm text-muted-foreground">
            {t("customer.waiter_order_hint", locale)}
          </p>
        )}

        {tab === "orders" && (
          <OrderStatusList
            orders={orders}
            currency={data.restaurant.currency}
            locale={locale}
            loading={ordersLoading}
          />
        )}

        {tab === "pay" && (
          <PayScreen
            payment={payment}
            currency={data.restaurant.currency}
            locale={locale}
            canPay={canPay}
            sessionId={sessionId}
            getToken={getToken}
            onSessionClosed={onSessionClosed}
          />
        )}
      </main>

      {sessionId && !readOnly && (
        <footer className="sticky bottom-0 z-10 border-t border-card-border bg-background/95 px-4 py-3 backdrop-blur-sm">
          <CustomerAssistanceActions
            sessionId={sessionId}
            tableId={data.table.id}
            locale={locale}
            sticky
          />
        </footer>
      )}
    </div>
  );
}
