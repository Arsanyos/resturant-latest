"use client";

import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { MenuCategory } from "../types";

export function CategoryTabs({
  categories,
  activeId,
  onChange,
  locale,
}: {
  categories: MenuCategory[];
  activeId: string;
  onChange: (id: string) => void;
  locale: SupportedLocale;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onChange(category.id)}
          className={cn(
            "shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition",
            activeId === category.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {t(category.i18nKey, locale)}
        </button>
      ))}
    </div>
  );
}
