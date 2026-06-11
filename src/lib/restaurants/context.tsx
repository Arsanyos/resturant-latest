"use client";

import { createContext, useContext } from "react";
import type { RestaurantContextData } from "./serialize";

interface RestaurantContextValue {
  restaurant: RestaurantContextData;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

export function RestaurantProvider({
  restaurant,
  children,
}: {
  restaurant: RestaurantContextData;
  children: React.ReactNode;
}) {
  return (
    <RestaurantContext.Provider value={{ restaurant }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext);
  if (!ctx) {
    throw new Error("useRestaurant must be used within RestaurantProvider");
  }
  return ctx;
}
