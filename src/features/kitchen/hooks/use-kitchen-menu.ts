"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type { KitchenMenuData } from "../types";

export function useKitchenMenu(slug: string, restaurantId: string) {
  const [data, setData] = useState<KitchenMenuData>({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/restaurants/${slug}/kitchen/menu`);
      if (!response.ok) throw new Error("Failed to load kitchen menu");
      const json = (await response.json()) as KitchenMenuData;
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

  const patchAvailability = useCallback(
    (menuItemId: string, available: boolean) => {
      setData((prev) => ({
        categories: prev.categories.map((category) => ({
          ...category,
          items: category.items.map((item) =>
            item.id === menuItemId
              ? {
                  ...item,
                  available,
                  manualAvailable: available,
                }
              : item
          ),
        })),
      }));
    },
    []
  );

  useRealtime({
    restaurantId,
    enabled: !!restaurantId,
    topics: [REALTIME_EVENTS.MENU_AVAILABILITY_CHANGED],
    onEvent: (envelope) => {
      const menuItemId = envelope.payload.menuItemId;
      const available = envelope.payload.available;
      if (typeof menuItemId !== "string" || typeof available !== "boolean") {
        void refresh();
        return;
      }
      patchAvailability(menuItemId, available);
    },
  });

  const toggleAvailability = useCallback(
    async (itemId: string, nextAvailable: boolean) => {
      patchAvailability(itemId, nextAvailable);
      try {
        const response = await fetch(`/api/menu/items/${itemId}/availability`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manualAvailable: nextAvailable }),
        });
        if (!response.ok) throw new Error("toggle_failed");
        const json = (await response.json()) as {
          available: boolean;
          manualAvailable: boolean;
        };
        patchAvailability(itemId, json.available);
      } catch {
        await refresh();
        throw new Error("toggle_failed");
      }
    },
    [patchAvailability, refresh]
  );

  return {
    data,
    loading,
    error,
    refresh,
    toggleAvailability,
  };
}
