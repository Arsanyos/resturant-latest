"use client";

import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { KitchenWindow } from "../types";

const WINDOWS: KitchenWindow[] = ["all", "60", "30", "10"];

const WINDOW_KEYS: Record<KitchenWindow, string> = {
  all: "kitchen.filter.all",
  "60": "kitchen.filter.60",
  "30": "kitchen.filter.30",
  "10": "kitchen.filter.10",
};

export function TimeFilter({
  value,
  onChange,
  locale,
}: {
  value: KitchenWindow;
  onChange: (window: KitchenWindow) => void;
  locale: SupportedLocale;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-pill border border-card-border bg-muted p-1">
      {WINDOWS.map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => onChange(w)}
          className={cn(
            "rounded-pill px-3 py-1.5 text-xs font-medium transition sm:text-sm",
            value === w
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground"
          )}
        >
          {t(WINDOW_KEYS[w], locale)}
        </button>
      ))}
    </div>
  );
}
