"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type { WaiterTablesData } from "../types";

const TABLE_REALTIME_TOPICS = [
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
  REALTIME_EVENTS.TIP_RECEIVED,
] as const;

export function useTableAssignments(slug: string, restaurantId: string) {
  const [data, setData] = useState<WaiterTablesData>({ tables: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/restaurants/${slug}/waiter/tables`);
      if (!response.ok) throw new Error("Failed to load tables");
      const json = (await response.json()) as WaiterTablesData;
      setData(json);
    } catch {
      setError("load_failed");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onRealtimeEvent = useCallback(() => void refresh(true), [refresh]);

  useRealtime({
    restaurantId,
    enabled: !!restaurantId,
    topics: TABLE_REALTIME_TOPICS,
    onEvent: onRealtimeEvent,
  });

  return { data, loading, error, refresh };
}
