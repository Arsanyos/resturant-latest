"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionBill } from "../types";

export function useSessionBill(slug: string, sessionId: string | null) {
  const [bill, setBill] = useState<SessionBill | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setBill(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/restaurants/${slug}/cashier/sessions/${sessionId}`
      );
      if (!response.ok) throw new Error("Failed to load bill");
      const json = (await response.json()) as SessionBill;
      setBill(json);
    } catch {
      setError("load_failed");
    } finally {
      setLoading(false);
    }
  }, [slug, sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { bill, loading, error, refresh };
}
