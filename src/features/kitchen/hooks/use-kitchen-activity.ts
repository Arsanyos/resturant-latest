"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActivityEntry } from "../types";

export function useKitchenActivity(slug: string, refreshKey = 0) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/restaurants/${slug}/kitchen/activity`
      );
      if (!response.ok) throw new Error("Failed");
      const json = (await response.json()) as { entries: ActivityEntry[] };
      setEntries(json.entries);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  return { entries, loading, refresh };
}
