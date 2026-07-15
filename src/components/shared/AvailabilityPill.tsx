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
  function CheckIcon({ className }: { className?: string }) {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        className={className}
      >
        <path
          d="M3.5 8.5 6.5 11.5 12.5 4.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  
  function XIcon({ className }: { className?: string }) {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        className={className}
      >
        <path
          d="M4 4 12 12M12 4 4 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium",
        available
          ? "bg-success/15 text-success"
          : "bg-danger/15 text-danger",
        className,
        available ? "bg-green-500 text-green" : "bg-red-500 text-red"
      )}
    >
      {available
        ? <div className="flex items-center gap-2"> <CheckIcon className="w-4 h-4    rounded-full" /> {t("common.available", locale)}</div>
        : <div className="flex items-center gap-2"> <XIcon className="w-4 h-4  rounded-full" /> {t("common.unavailable", locale)}</div>}
    </span>
  );
}
