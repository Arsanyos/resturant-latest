"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type { KdsData, KitchenWindow } from "../types";

export function useKdsOrders(
  slug: string,
  restaurantId: string,
  window: KitchenWindow
) {
  const [data, setData] = useState<KdsData>({ tables: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/restaurants/${slug}/kitchen/orders?window=${window}`
      );
      if (!response.ok) throw new Error("Failed to load kitchen orders");
      const json = (await response.json()) as KdsData;
      setData(json);
    } catch {
      setError("load_failed");
    } finally {
      setLoading(false);
    }
  }, [slug, window]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRealtime({
    restaurantId,
    enabled: !!restaurantId,
    topics: [
      REALTIME_EVENTS.ORDER_PLACED,
      REALTIME_EVENTS.ORDER_ITEM_STATUS_CHANGED,
      REALTIME_EVENTS.SESSION_CLOSED,
    ],
    onEvent: () => void refresh(),
  });

  useEffect(() => {
    const interval = setInterval(() => void refresh(), 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { data, loading, error, refresh };
}
