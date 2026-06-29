"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RealtimeEnvelope, RealtimeEventName } from "./events";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_HUB_URL ?? "ws://localhost:3001/realtime";

function parseRealtimeEnvelope(data: unknown): RealtimeEnvelope | null {
  if (
    typeof data === "object" &&
    data !== null &&
    "event" in data &&
    typeof (data as { event: unknown }).event === "string" &&
    "restaurantId" in data &&
    typeof (data as { restaurantId: unknown }).restaurantId === "string"
  ) {
    return data as RealtimeEnvelope;
  }
  return null;
}

export function useRealtime(options: {
  restaurantId: string;
  topics?: readonly RealtimeEventName[];
  enabled?: boolean;
  onEvent: (envelope: RealtimeEnvelope) => void;
}) {
  const { restaurantId, topics, enabled = true, onEvent } = options;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const topicsKey = (topics ?? ["*"]).join(",");
  const subscribedTopics = useMemo(
    () => (topicsKey === "*" ? ["*"] : topicsKey.split(",")),
    [topicsKey]
  );

  const connect = useCallback(() => {
    if (!enabled || !restaurantId) return () => {};

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let closed = false;

    function scheduleReconnect() {
      if (closed) return;
      const delay = Math.min(1000 * 2 ** attempts, 30000);
      attempts += 1;
      reconnectTimer = setTimeout(() => open(), delay);
    }

    function open() {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        attempts = 0;
        ws?.send(
          JSON.stringify({
            type: "subscribe",
            restaurantId,
            topics: subscribedTopics,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as unknown;
          const envelope = parseRealtimeEnvelope(data);
          if (envelope) {
            onEventRef.current(envelope);
          }
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onclose = () => scheduleReconnect();
      ws.onerror = () => ws?.close();
    }

    open();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [enabled, restaurantId, subscribedTopics]);

  useEffect(() => connect(), [connect]);
}
