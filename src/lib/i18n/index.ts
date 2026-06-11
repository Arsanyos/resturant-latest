import en from "../../../messages/en.json";
import am from "../../../messages/am.json";
import type { SupportedLocale } from "./types";

const messages: Record<SupportedLocale, Record<string, string>> = {
  en,
  am,
};

export function t(key: string, locale: SupportedLocale = "en"): string {
  return messages[locale]?.[key] ?? messages.en[key] ?? key;
}

export { type SupportedLocale } from "./types";
