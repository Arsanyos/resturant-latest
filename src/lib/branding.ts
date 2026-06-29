export const platformBranding = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "TableOrder",
  logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL ?? "/images/brand-logo.svg",
  websiteUrl: process.env.NEXT_PUBLIC_BRAND_WEBSITE_URL ?? undefined,
};

export type RestaurantSocialLinks = {
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  telegramUrl: string | null;
  xUrl: string | null;
};

export function hasSocialLinks(social: RestaurantSocialLinks): boolean {
  return Object.values(social).some(Boolean);
}
