"use client";

import { useCallback, useEffect, useState } from "react";
import type { BootstrapData } from "../types";

export function useSessionStatus(
  slug: string,
  tableNumber: number,
  getToken: () => string | null
) {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (token) params.set("deviceToken", token);

      const url = `/api/restaurants/${slug}/tables/${tableNumber}/bootstrap${
        params.size ? `?${params.toString()}` : ""
      }`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Bootstrap failed");

      const json = (await response.json()) as BootstrapData;
      setData(json);
    } catch {
      setError("bootstrap_failed");
    } finally {
      setLoading(false);
    }
  }, [getToken, slug, tableNumber]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
