import type { Restaurant } from "@prisma/client";
import { getRestaurantBySlug } from "./queries";

type DayHours = { open: string; close: string };
type OpeningHours = Record<string, DayHours>;

function getLocalDayAndMinutes(timezone: string): { dayKey: string; minutes: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Monday";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  return {
    dayKey: weekday.toLowerCase(),
    minutes: hour * 60 + minute,
  };
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function computeIsOpen(restaurant: Restaurant): boolean {
  if (restaurant.manualOpen !== null && restaurant.manualOpen !== undefined) {
    return restaurant.manualOpen;
  }

  const hours = restaurant.openingHours as OpeningHours;
  const { dayKey, minutes } = getLocalDayAndMinutes(restaurant.timezone);
  const today = hours[dayKey];

  if (!today) {
    return false;
  }

  const open = parseTimeToMinutes(today.open);
  const close = parseTimeToMinutes(today.close);

  if (close <= open) {
    return minutes >= open || minutes < close;
  }

  return minutes >= open && minutes < close;
}

export async function resolveRestaurantBySlug(slug: string) {
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant || !restaurant.isActive) {
    return null;
  }

  return restaurant;
}
