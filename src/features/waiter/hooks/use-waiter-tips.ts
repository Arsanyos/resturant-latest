"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";

const TIP_REALTIME_TOPICS = [REALTIME_EVENTS.TIP_RECEIVED] as const;

export function useWaiterTips(slug: string, restaurantId: string) {
  const [tipCount, setTipCount] = useState(0);
  const [tipTotal, setTipTotal] = useState(0);
  const [currency, setCurrency] = useState("ETB");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/restaurants/${slug}/waiter/tips`);
      if (res.ok) {
        const json = (await res.json()) as {
          tipCount: number;
          tipTotal: number;
          currency: string;
        };
        setTipCount(json.tipCount);
        setTipTotal(json.tipTotal);
        setCurrency(json.currency);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onRealtimeEvent = useCallback(() => void refresh(true), [refresh]);

  useRealtime({
    restaurantId,
    enabled: !!restaurantId,
    topics: TIP_REALTIME_TOPICS,
    onEvent: onRealtimeEvent,
  });

  return { tipCount, tipTotal, currency, loading, refresh };
}
