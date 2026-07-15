"use client";

import { useState } from "react";
import { AvailabilityPill } from "@/components/shared/AvailabilityPill";
import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useKitchenMenu } from "../hooks/use-kitchen-menu";

export function KitchenMenuAvailabilityView({
  slug,
  restaurantId,
  locale,
}: {
  slug: string;
  restaurantId: string;
  locale: SupportedLocale;
}) {
  const { data, loading, error, toggleAvailability } = useKitchenMenu(
    slug,
    restaurantId
  );
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggle(itemId: string, nextAvailable: boolean) {
    setTogglingId(itemId);
    try {
      await toggleAvailability(itemId, nextAvailable);
    } catch {
      // Hook reverts via refresh
    } finally {
      setTogglingId(null);
    }
  }

  if (loading && data.categories.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        {t("common.loading", locale)}
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-center text-danger">
        {t("kitchen.menu_load_error", locale)}
      </p>
    );
  }

  if (data.categories.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-card border border-card-border bg-card p-8 text-center">
        <p className="text-xl font-bold text-foreground">
          {t("kitchen.menu_empty", locale)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          {t("kitchen.menu_title", locale)}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("kitchen.menu_subtitle", locale)}
        </p>
      </div>

      {data.categories.map((category) => (
        <section key={category.id} className="space-y-3">
          <h3 className="sticky top-0 z-[1] rounded-lg bg-secondary px-3 py-2 text-sm font-semibold uppercase tracking-wide text-secondary-foreground">
            {category.name}
          </h3>
          <ul className="space-y-2">
            {category.items.map((item) => {
              const busy = togglingId === item.id;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-card border border-card-border bg-card p-3",
                    !item.available && "opacity-80"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <AvailabilityPill
                        available={item.available}
                        locale={locale}
                      />
                    </div>
                    {item.description ? (
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void handleToggle(item.id, !item.manualAvailable)
                    }
                    className={cn(
                      "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition disabled:opacity-50",
                      item.manualAvailable ? "bg-success" : "bg-muted"
                    )}
                    aria-pressed={item.manualAvailable}
                    aria-label={
                      item.manualAvailable
                        ? t("kitchen.menu_toggle_unavailable", locale)
                        : t("kitchen.menu_toggle_available", locale)
                    }
                  >
                    <span
                      className={cn(
                        "inline-block h-6 w-6 rounded-full bg-white shadow transition",
                        item.manualAvailable
                          ? "translate-x-7"
                          : "translate-x-1"
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
