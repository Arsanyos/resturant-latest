"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type { WaiterTableDetail } from "../types";

const TABLE_DETAIL_REALTIME_TOPICS = [
  REALTIME_EVENTS.ORDER_PLACED,
  REALTIME_EVENTS.ORDER_ITEM_STATUS_CHANGED,
  REALTIME_EVENTS.ORDER_ITEM_CANCELLED,
  REALTIME_EVENTS.SESSION_STARTED,
  REALTIME_EVENTS.SESSION_CLOSED,
  REALTIME_EVENTS.TABLE_ASSIGNMENT_CHANGED,
  REALTIME_EVENTS.ASSISTANCE_CREATED,
  REALTIME_EVENTS.ASSISTANCE_UPDATED,
  REALTIME_EVENTS.PAYMENT_UPDATED,
  REALTIME_EVENTS.PAYMENT_COMPLETED,
] as const;

export function useWaiterTableDetail(
  slug: string,
  tableId: string | null,
  restaurantId: string
) {
  const [detail, setDetail] = useState<WaiterTableDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!tableId) {
      setDetail(null);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/restaurants/${slug}/waiter/tables/${tableId}`
      );
      if (!response.ok) throw new Error("Failed to load table");
      const json = (await response.json()) as WaiterTableDetail;
      setDetail(json);
    } catch {
      setError("load_failed");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [slug, tableId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onRealtimeEvent = useCallback(() => void refresh(true), [refresh]);

  useRealtime({
    restaurantId,
    enabled: !!restaurantId && !!tableId,
    topics: TABLE_DETAIL_REALTIME_TOPICS,
    onEvent: onRealtimeEvent,
  });

  return { detail, loading, error, refresh };
}
