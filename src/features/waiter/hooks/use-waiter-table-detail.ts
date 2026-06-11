"use client";

import { useCallback, useEffect, useState } from "react";
import type { WaiterTableDetail } from "../types";

export function useWaiterTableDetail(slug: string, tableId: string | null) {
  const [detail, setDetail] = useState<WaiterTableDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tableId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/restaurants/${slug}/waiter/tables/${tableId}`
      );
      if (!response.ok) throw new Error("Failed to load table");
      const json = (await response.json()) as WaiterTableDetail;
      setDetail(json);
    } catch {
      setError("load_failed");
    } finally {
      setLoading(false);
    }
  }, [slug, tableId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { detail, loading, error, refresh };
}
