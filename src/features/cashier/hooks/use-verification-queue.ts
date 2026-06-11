"use client";

import { useCallback, useEffect, useState } from "react";
import type { VerificationQueueItem } from "../types";

export function useVerificationQueue(slug: string) {
  const [items, setItems] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/restaurants/${slug}/cashier/verification`
      );
      if (!response.ok) throw new Error("Failed");
      const json = (await response.json()) as { items: VerificationQueueItem[] };
      setItems(json.items);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, refresh };
}
