"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrderView } from "../utils/order-grouping";

interface PaymentView {
  id: string;
  subtotal: number;
  serviceCharge: number;
  tax: number;
  totalDue: number;
  totalPaid: number;
  balance: number;
  status: string;
}

export function useOrders(
  sessionId: string | null,
  getToken: () => string | null,
  enabled: boolean
) {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionId || !enabled) return;

    setLoading(true);
    try {
      const token = getToken();
      const headers: HeadersInit = {};
      if (token) headers["x-device-token"] = token;

      const response = await fetch(`/api/sessions/${sessionId}/orders`, {
        headers,
      });

      if (!response.ok) throw new Error("Failed to load orders");

      const json = (await response.json()) as {
        orders: OrderView[];
        payment: PaymentView | null;
      };

      setOrders(json.orders);
      setPayment(json.payment);
    } catch {
      // keep previous state on poll failure
    } finally {
      setLoading(false);
    }
  }, [sessionId, getToken, enabled]);

  useEffect(() => {
    void refresh();
    if (!sessionId || !enabled) return;

    const interval = setInterval(() => void refresh(), 8000);
    return () => clearInterval(interval);
  }, [refresh, sessionId, enabled]);

  return { orders, payment, loading, refresh };
}
