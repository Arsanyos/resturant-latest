import type { Restaurant } from "@prisma/client";

export type RestaurantContextData = Omit<
  Restaurant,
  "taxPct" | "servicePct" | "createdAt" | "updatedAt"
> & {
  taxPct: number;
  servicePct: number;
  createdAt: string;
  updatedAt: string;
};

export function serializeRestaurant(
  restaurant: Restaurant
): RestaurantContextData {
  return {
    ...restaurant,
    taxPct: Number(restaurant.taxPct),
    servicePct: Number(restaurant.servicePct),
    createdAt: restaurant.createdAt.toISOString(),
    updatedAt: restaurant.updatedAt.toISOString(),
  };
}
