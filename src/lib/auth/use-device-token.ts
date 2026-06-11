"use client";

import { useCallback, useMemo } from "react";

function storageKey(slug: string, tableNumber: number | string) {
  return `restaurant:${slug}:table:${tableNumber}:deviceToken`;
}

export function useDeviceToken(slug: string, tableNumber: number | string) {
  const key = useMemo(
    () => storageKey(slug, tableNumber),
    [slug, tableNumber]
  );

  const getToken = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem(key);
  }, [key]);

  const setToken = useCallback(
    (token: string) => {
      localStorage.setItem(key, token);
    },
    [key]
  );

  const clearToken = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);

  return { getToken, setToken, clearToken, key };
}

export function getDeviceTokenFromStorage(
  slug: string,
  tableNumber: number | string
): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(storageKey(slug, tableNumber));
}
