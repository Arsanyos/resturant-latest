"use client";

import { useCallback, useEffect, useState } from "react";

export function useWaiterTips(slug: string) {
  const [tipCount, setTipCount] = useState(0);
  const [tipTotal, setTipTotal] = useState(0);
  const [currency, setCurrency] = useState("ETB");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/restaurants/${slug}/waiter/tips`);
      if (res.ok) {
        const json = (await res.json()) as {
          tipCount: number;
          tipTotal: number;
          currency: string;
        };
        setTipCount(json.tipCount);
        setTipTotal(json.tipTotal);
        setCurrency(json.currency);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { tipCount, tipTotal, currency, loading, refresh };
}
