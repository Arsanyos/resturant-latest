"use client";

import { useCallback, useEffect, useState } from "react";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { useRealtime } from "@/lib/realtime/use-realtime";
import type { WaiterMenuData } from "../types";

export function useWaiterMenu(
  slug: string,
  restaurantId: string,
  enabled: boolean
) {
  const [data, setData] = useState<WaiterMenuData | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/restaurants/${slug}/waiter/menu`);
      if (!response.ok) throw new Error("Failed to load menu");
      const json = (await response.json()) as WaiterMenuData;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [slug, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRealtime({
    restaurantId,
    enabled: enabled && !!restaurantId,
    topics: [REALTIME_EVENTS.MENU_AVAILABILITY_CHANGED],
    onEvent: (envelope) => {
      const menuItemId = envelope.payload.menuItemId;
      const available = envelope.payload.available;
      if (typeof menuItemId !== "string" || typeof available !== "boolean") {
        void refresh();
        return;
      }
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          menu: prev.menu.map((category) => ({
            ...category,
            items: category.items.map((item) =>
              item.id === menuItemId ? { ...item, available } : item
            ),
          })),
        };
      });
    },
  });

  return { data, loading, refresh };
}
