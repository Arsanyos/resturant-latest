import {
  computeIsOpen,
  resolveRestaurantBySlug,
} from "@/lib/restaurants/service";
import {
  getMenuForBootstrap,
  getTableByRestaurantAndNumber,
} from "@/lib/restaurants/queries";
import { resolveSessionState } from "@/lib/sessions/service";

export async function getBootstrapData(
  slug: string,
  tableNumber: number,
  deviceToken?: string
) {
  const restaurant = await resolveRestaurantBySlug(slug);

  if (!restaurant) {
    return null;
  }

  const table = await getTableByRestaurantAndNumber(
    restaurant.id,
    tableNumber
  );

  if (!table || !table.isActive) {
    return null;
  }

  const [menu, sessionInfo] = await Promise.all([
    getMenuForBootstrap(restaurant.id),
    resolveSessionState(table.id, deviceToken),
  ]);

  return {
    restaurant: {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
      logoUrl: restaurant.logoUrl,
      instagramUrl: restaurant.instagramUrl,
      facebookUrl: restaurant.facebookUrl,
      tiktokUrl: restaurant.tiktokUrl,
      telegramUrl: restaurant.telegramUrl,
      xUrl: restaurant.xUrl,
      primaryColor: restaurant.primaryColor,
      secondaryColor: restaurant.secondaryColor,
      currency: restaurant.currency,
      taxPct: Number(restaurant.taxPct),
      servicePct: Number(restaurant.servicePct),
      adImageUrl: restaurant.adImageUrl,
      adRedirectUrl: restaurant.adRedirectUrl,
    },
    table: {
      id: table.id,
      number: table.number,
      label: table.label,
    },
    isOpen: computeIsOpen(restaurant),
    sessionState: sessionInfo.sessionState,
    sessionId: sessionInfo.sessionId,
    deviceToken: null as string | null,
    menu,
  };
}
