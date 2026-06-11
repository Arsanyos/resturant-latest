"use client";

import { useCallback, useEffect, useState } from "react";
import type { WaiterMenuData } from "../types";

export function useWaiterMenu(slug: string, enabled: boolean) {
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

  return { data, loading, refresh };
}
