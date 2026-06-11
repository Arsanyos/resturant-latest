"use client";

import { useCallback, useEffect, useState } from "react";

export type CustomerAssistanceStatus = "none" | "PENDING" | "ACKNOWLEDGED";

export function useCustomerAssistance(
  sessionId: string | null,
  tableId: string
) {
  const [status, setStatus] = useState<CustomerAssistanceStatus>("none");
  const [waiterName, setWaiterName] = useState<string | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}/assistance`);
      if (!response.ok) return;

      const json = (await response.json()) as {
        request: {
          status: "PENDING" | "ACKNOWLEDGED";
          waiterName: string | null;
        } | null;
      };

      if (!json.request) {
        setStatus("none");
        setWaiterName(null);
        return;
      }

      setStatus(json.request.status);
      setWaiterName(json.request.waiterName);
    } catch {
      // Keep last known status on poll failure
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  const requestAssistance = useCallback(async () => {
    if (!sessionId) return false;
    setRequestLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/assistance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          deviceInfo: navigator.userAgent.slice(0, 200),
        }),
      });
      if (!response.ok) return false;
      setStatus("PENDING");
      setWaiterName(null);
      return true;
    } finally {
      setRequestLoading(false);
    }
  }, [sessionId, tableId]);

  return {
    status,
    waiterName,
    requestLoading,
    requestAssistance,
    refresh,
  };
}
