"use client";

import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AvailabilityPill({
  available,
  locale,
  className,
}: {
  available: boolean;
  locale: SupportedLocale;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        available
          ? "bg-success/15 text-success"
          : "bg-danger/15 text-danger",
        className
      )}
    >
      {available
        ? t("common.available", locale)
        : t("common.unavailable", locale)}
    </span>
  );
}
