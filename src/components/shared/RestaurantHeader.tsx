import { LanguageToggle } from "./LanguageToggle";
import type { SupportedLocale } from "@/lib/i18n";

export function RestaurantHeader({
  name,
  logoUrl,
  tableLabel,
  locale,
  onLocaleChange,
}: {
  name: string;
  logoUrl?: string | null;
  tableLabel: string;
  locale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
}) {
  return (
    <header className="border-b border-card-border bg-card/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                {name.charAt(0)}
              </div>
            )}
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
