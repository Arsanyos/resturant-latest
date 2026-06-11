"use client";

import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle({
  locale,
  onChange,
}: {
  locale: SupportedLocale;
  onChange: (locale: SupportedLocale) => void;
}) {
  return (
    <div className="flex rounded-pill border border-card-border bg-muted p-0.5 text-xs font-medium">
      {(["en", "am"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={cn(
            "rounded-pill px-3 py-1 transition",
            locale === code
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground"
          )}
          aria-pressed={locale === code}
        >
          {t(`lang.${code}`, locale)}
        </button>
      ))}
    </div>
  );
}
