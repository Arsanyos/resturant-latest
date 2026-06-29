"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { REALTIME_EVENTS, type RealtimeEnvelope } from "@/lib/realtime/events";
import { notifyIfHidden } from "@/lib/realtime/notify-if-hidden";

export type WaiterNotification = {
  type: "session" | "assistance";
  tableNumber: number;
};

const NOTIFICATION_TOPICS = [
  REALTIME_EVENTS.SESSION_STARTED,
  REALTIME_EVENTS.ASSISTANCE_CREATED,
] as const;

const DISMISS_MS = 6000;

function tableNumberFromPayload(payload: Record<string, unknown>): number | null {
  const tableNumber = payload.tableNumber;
  return typeof tableNumber === "number" ? tableNumber : null;
}

export function useWaiterNotifications(restaurantId: string) {
  const [notification, setNotification] = useState<WaiterNotification | null>(
    null
  );

  const onRealtimeEvent = useCallback((envelope: RealtimeEnvelope) => {
    const tableNumber = tableNumberFromPayload(envelope.payload);
    if (tableNumber === null) return;

    if (envelope.event === REALTIME_EVENTS.SESSION_STARTED) {
      setNotification({ type: "session", tableNumber });
      notifyIfHidden(
        "New table session",
        `Table ${tableNumber} — a customer started a session.`
      );
    } else if (envelope.event === REALTIME_EVENTS.ASSISTANCE_CREATED) {
      setNotification({ type: "assistance", tableNumber });
      notifyIfHidden(
        "Assistance requested",
        `Table ${tableNumber} needs help.`
      );
    }
  }, []);

  useRealtime({
    restaurantId,
    enabled: !!restaurantId,
    topics: NOTIFICATION_TOPICS,
    onEvent: onRealtimeEvent,
  });

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), DISMISS_MS);
    return () => clearTimeout(timer);
  }, [notification]);

  const dismiss = useCallback(() => setNotification(null), []);

  return { notification, dismiss };
}
