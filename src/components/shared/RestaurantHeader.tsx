import { LanguageToggle } from "./LanguageToggle";
import type { SupportedLocale } from "@/lib/i18n";

export function RestaurantHeader({
  name,
  tableLabel,
  locale,
  onLocaleChange,
}: {
  name: string;
  tableLabel: string;
  locale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-card-border bg-card/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              {name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-foreground">
                {name}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {tableLabel}
              </p>
            </div>
          </div>
        </div>
        <LanguageToggle locale={locale} onChange={onLocaleChange} />
      </div>
    </header>
  );
}
