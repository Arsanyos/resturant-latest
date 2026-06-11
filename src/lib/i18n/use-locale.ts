"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupportedLocale } from "./types";

const LOCALE_KEY = "app-locale";

export function useLocale(defaultLocale: SupportedLocale = "en") {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === "en" || stored === "am") {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((next: SupportedLocale) => {
    localStorage.setItem(LOCALE_KEY, next);
    setLocaleState(next);
  }, []);

  return { locale, setLocale };
}
