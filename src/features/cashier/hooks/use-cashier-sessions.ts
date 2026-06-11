"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type { CashierSessionSummary } from "../types";

const CASHIER_REALTIME_TOPICS = [
  REALTIME_EVENTS.ORDER_PLACED,
  REALTIME_EVENTS.ORDER_ITEM_STATUS_CHANGED,
  REALTIME_EVENTS.ORDER_ITEM_CANCELLED,
  REALTIME_EVENTS.SESSION_STARTED,
  REALTIME_EVENTS.SESSION_CLOSED,
  REALTIME_EVENTS.PAYMENT_UPDATED,
  REALTIME_EVENTS.PAYMENT_COMPLETED,
] as const;

export function useCashierSessions(slug: string, restaurantId: string) {
  const [sessions, setSessions] = useState<CashierSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/restaurants/${slug}/cashier/sessions`
      );
      if (!response.ok) throw new Error("Failed to load sessions");
      const json = (await response.json()) as {
        sessions: CashierSessionSummary[];
      };
      setSessions(json.sessions);
    } catch {
      setError("load_failed");
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
    topics: CASHIER_REALTIME_TOPICS,
    onEvent: onRealtimeEvent,
  });

  useEffect(() => {
    const interval = setInterval(() => void refresh(true), 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { sessions, loading, error, refresh };
}
