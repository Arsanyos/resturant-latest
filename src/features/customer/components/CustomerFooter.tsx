"use client";

import { platformBranding, type RestaurantSocialLinks } from "@/lib/branding";
import { t, type SupportedLocale } from "@/lib/i18n";

type SocialKey = keyof RestaurantSocialLinks;

const SOCIAL_CONFIG: Array<{
  key: SocialKey;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    key: "instagramUrl",
    label: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.427.403a4.92 4.92 0 0 1 1.77 1.153 4.92 4.92 0 0 1 1.153 1.77c.163.457.349 1.257.403 2.427.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.403 2.427a4.92 4.92 0 0 1-1.153 1.77 4.92 4.92 0 0 1-1.77 1.153c-.457.163-1.257.349-2.427.403-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.427-.403a4.92 4.92 0 0 1-1.77-1.153 4.92 4.92 0 0 1-1.153-1.77c-.163-.457-.349-1.257-.403-2.427C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.054-1.17.24-1.97.403-2.427a4.92 4.92 0 0 1 1.153-1.77 4.92 4.92 0 0 1 1.77-1.153c.457-.163 1.257-.349 2.427-.403C8.416 2.175 8.796 2.163 12 2.163zm0 1.622c-3.16 0-3.533.012-4.775.07-1.024.047-1.58.218-1.948.363a3.3 3.3 0 0 0-1.197.78 3.3 3.3 0 0 0-.78 1.197c-.145.368-.316.924-.363 1.948-.058 1.242-.07 1.615-.07 4.775s.012 3.533.07 4.775c.047 1.024.218 1.58.363 1.948a3.3 3.3 0 0 0 .78 1.197 3.3 3.3 0 0 0 1.197.78c.368.145.924.316 1.948.363 1.242.058 1.615.07 4.775.07s3.533-.012 4.775-.07c1.024-.047 1.58-.218 1.948-.363a3.3 3.3 0 0 0 1.197-.78 3.3 3.3 0 0 0 .78-1.197c.145-.368.316-.924.363-1.948.058-1.242.07-1.615.07-4.775s-.012-3.533-.07-4.775c-.047-1.024-.218-1.58-.363-1.948a3.3 3.3 0 0 0-.78-1.197 3.3 3.3 0 0 0-1.197-.78c-.368-.145-.924-.316-1.948-.363-1.242-.058-1.615-.07-4.775-.07zM12 7.378a4.622 4.622 0 1 0 0 9.244 4.622 4.622 0 0 0 0-9.244zm0 7.622a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm5.804-8.69a1.08 1.08 0 1 0 0 2.16 1.08 1.08 0 0 0 0-2.16z" />
      </svg>
    ),
  },
  {
    key: "facebookUrl",
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M22 12.07C22 6.48 17.52 2 11.93 2S2 6.48 2 12.07c0 4.99 3.65 9.13 8.43 9.88v-6.99H7.9v-2.89h2.53V9.41c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.89h-2.34v6.99C18.35 21.2 22 17.06 22 12.07z" />
      </svg>
    ),
  },
  {
    key: "tiktokUrl",
    label: "TikTok",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.88-2.89c.15 0 .3.01.44.04V9.4a6.34 6.34 0 1 0 5.17 6.23V8.69a8.16 8.16 0 0 0 4.49 1.35V6.69z" />
      </svg>
    ),
  },
  {
    key: "telegramUrl",
    label: "Telegram",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    key: "xUrl",
    label: "X",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

export function CustomerFooter({
  restaurantName,
  restaurantLogoUrl,
  social,
  locale,
  className,
}: {
  restaurantName: string;
  restaurantLogoUrl: string | null;
  social: RestaurantSocialLinks;
  locale: SupportedLocale;
  className?: string;
}) {
  const activeSocial = SOCIAL_CONFIG.filter(({ key }) => social[key]);

  const brandInner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={platformBranding.logoUrl}
        alt=""
        className="h-6 w-auto"
      />
      <span className="text-xs font-semibold text-foreground">
        {platformBranding.name}
      </span>
    </>
  );

  return (
    <footer
      className={`border-t border-card-border bg-card px-4 py-6 ${className ?? ""}`}
    >
      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex items-center gap-3">
          {restaurantLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurantLogoUrl}
              alt=""
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              {restaurantName.charAt(0)}
            </div>
          )}
          <p className="font-semibold text-foreground">{restaurantName}</p>
        </div>

        {activeSocial.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("customer.footer.follow_us", locale)}
            </p>
            <div className="flex flex-wrap gap-2">
              {activeSocial.map(({ key, label, icon }) => (
                <a
                  key={key}
                  href={social[key]!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-card-border bg-background text-foreground transition hover:border-primary hover:text-primary"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div className="border-t border-card-border pt-4">
          <p className="mb-2 text-center text-xs text-muted-foreground">
            {t("customer.footer.powered_by", locale)}
          </p>
          {platformBranding.websiteUrl ? (
            <a
              href={platformBranding.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 transition hover:opacity-80"
            >
              {brandInner}
            </a>
          ) : (
            <div className="flex items-center justify-center gap-2">
              {brandInner}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
