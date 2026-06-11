"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type { AssistanceRequestSummary } from "../types";

const ASSISTANCE_REALTIME_TOPICS = [
  REALTIME_EVENTS.ASSISTANCE_CREATED,
  REALTIME_EVENTS.ASSISTANCE_UPDATED,
] as const;

export function useAssistanceRequests(slug: string, restaurantId: string) {
  const [requests, setRequests] = useState<AssistanceRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/restaurants/${slug}/waiter/assistance`
      );
      if (!response.ok) throw new Error("Failed to load assistance");
      const json = (await response.json()) as {
        requests: AssistanceRequestSummary[];
      };
      setRequests(json.requests);
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
    topics: ASSISTANCE_REALTIME_TOPICS,
    onEvent: onRealtimeEvent,
  });

  useEffect(() => {
    const interval = setInterval(() => void refresh(true), 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { requests, loading, error, refresh };
}
