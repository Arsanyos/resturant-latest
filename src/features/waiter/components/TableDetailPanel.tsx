"use client";

import { KitchenStatus } from "@prisma/client";
import { useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";
import { StatusChip } from "@/components/shared/StatusChip";
import { t, type SupportedLocale } from "@/lib/i18n";
import { useWaiterMenu } from "../hooks/use-waiter-menu";
import type { WaiterTableDetail } from "../types";
import { SelfAssignButton } from "./SelfAssignButton";
import { WaiterOrderForm } from "./WaiterOrderForm";

export function TableDetailPanel({
  slug,
  detail,
  loading,
  locale,
  currency,
  onRefresh,
  onClose,
}: {
  slug: string;
  detail: WaiterTableDetail | null;
  loading: boolean;
  locale: SupportedLocale;
  currency: string;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const [cancelItemId, setCancelItemId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [openingSession, setOpeningSession] = useState(false);

  const showOrderForm = detail?.canMutate && !!detail.session;
  const { data: menuData } = useWaiterMenu(slug, !!showOrderForm);

  if (!detail && !loading) return null;

  async function openWaiterSession() {
    if (!detail) return;
    setOpeningSession(true);
    setActionError(null);
    try {
      const response = await fetch("/api/sessions/waiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantSlug: slug,
          tableNumber: detail.table.number,
        }),
      });
      if (!response.ok) {
        const json = (await response.json()) as { error?: string };
        throw new Error(json.error ?? "Failed");
      }
      onRefresh();
    } catch {
      setActionError(t("waiter.open_session_failed", locale));
    } finally {
      setOpeningSession(false);
    }
  }

  async function handleCancel(itemId: string) {
    if (!cancelReason.trim()) return;
    setActionError(null);
    try {
      const response = await fetch(`/api/order-items/${itemId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      if (!response.ok) throw new Error("cancel_failed");
      setCancelItemId(null);
      setCancelReason("");
      onRefresh();
    } catch {
      setActionError(t("waiter.cancel_failed", locale));
    }
  }

  async function handleReorder(itemId: string) {
    if (!detail?.session) return;
    const reason = prompt(t("waiter.reorder_reason_prompt", locale));
    if (!reason?.trim()) return;
    setActionError(null);
    try {
      const response = await fetch(
        `/api/sessions/${detail.session.id}/orders/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceOrderItemId: itemId,
            reason: reason.trim(),
          }),
        }
      );
      if (!response.ok) throw new Error("reorder_failed");
      onRefresh();
    } catch {
      setActionError(t("waiter.reorder_failed", locale));
    }
  }

  return (
    <AppCard className="sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">
          {detail
            ? `${t("customer.table", locale)} ${detail.table.number}`
            : t("common.loading", locale)}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("waiter.close_panel", locale)}
        </button>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">
          {t("common.loading", locale)}
        </p>
      )}

      {detail && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{detail.table.label}</p>

          {!detail.isAssignedToMe && !detail.canMutate && (
            <div className="rounded-lg border border-dashed border-card-border bg-background p-3">
              <p className="mb-2 text-sm text-muted-foreground">
                {t("waiter.read_only_hint", locale)}
              </p>
              <SelfAssignButton
                tableId={detail.table.id}
                locale={locale}
                onAssigned={onRefresh}
              />
            </div>
          )}

          {detail.canMutate && !detail.session && (
            <button
              type="button"
              onClick={() => void openWaiterSession()}
              disabled={openingSession}
              className="w-full rounded-pill bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {openingSession
                ? t("common.loading", locale)
                : t("waiter.open_session", locale)}
            </button>
          )}

          {detail.session && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t("waiter.session_started", locale)}:{" "}
                {new Date(detail.session.startedAt).toLocaleString()} (
                {detail.session.startedByType})
              </p>

              {detail.session.payment && (
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    {t("customer.total_due", locale)}:{" "}
                  </span>
                  <Money
                    amount={detail.session.payment.totalDue}
                    currency={currency}
                  />
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({detail.session.payment.status})
                  </span>
                </div>
              )}

              {detail.session.orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg border border-card-border p-3"
                >
                  <p className="mb-2 text-sm font-semibold">
                    {t("customer.order_number", locale)} #{order.orderNumber}
                  </p>
                  <ul className="space-y-2">
                    {order.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-col gap-1 border-b border-card-border pb-2 last:border-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm">
                            {t(item.nameI18nKey, locale)} × {item.quantity}
                          </span>
                          <StatusChip
                            status={item.kitchenStatus as KitchenStatus}
                            locale={locale}
                          />
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground">
                            {item.notes}
                          </p>
                        )}
                        {detail.canMutate &&
                          item.kitchenStatus !== KitchenStatus.CANCELLED && (
                            <div className="flex flex-wrap gap-2">
                              {(item.kitchenStatus === KitchenStatus.PENDING ||
                                item.kitchenStatus ===
                                  KitchenStatus.BEING_PREPARED ||
                                item.kitchenStatus === KitchenStatus.SERVED) && (
                                <button
                                  type="button"
                                  onClick={() => setCancelItemId(item.id)}
                                  className="text-xs text-danger underline"
                                >
                                  {t("waiter.cancel_item", locale)}
                                </button>
                              )}
                              {item.kitchenStatus === KitchenStatus.SERVED && (
                                <button
                                  type="button"
                                  onClick={() => void handleReorder(item.id)}
                                  className="text-xs text-secondary underline"
                                >
                                  {t("waiter.reorder", locale)}
                                </button>
                              )}
                            </div>
                          )}
                        {cancelItemId === item.id && (
                          <div className="mt-2 space-y-2">
                            <input
                              type="text"
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              placeholder={t(
                                "waiter.cancel_reason_placeholder",
                                locale
                              )}
                              className="w-full rounded-lg border border-card-border px-2 py-1 text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleCancel(item.id)}
                                className="rounded-pill bg-danger px-3 py-1 text-xs text-white"
                              >
                                {t("waiter.confirm_cancel", locale)}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelItemId(null);
                                  setCancelReason("");
                                }}
                                className="text-xs text-muted-foreground"
                              >
                                {t("waiter.dismiss", locale)}
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {detail.canMutate && detail.session && menuData && (
            <WaiterOrderForm
              menuData={menuData}
              sessionId={detail.session.id}
              locale={locale}
              onOrderPlaced={onRefresh}
            />
          )}

          {detail.canMutate && (
            <p className="text-xs text-muted-foreground">
              {t("waiter.telebirr_hint", locale)}
            </p>
          )}

          {actionError && (
            <p className="text-sm text-danger">{actionError}</p>
          )}
        </div>
      )}
    </AppCard>
  );
}
