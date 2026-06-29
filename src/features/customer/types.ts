import type { SessionState } from "@/lib/validation/session";

export interface MenuModifier {
  id: string;
  nameI18nKey: string;
  priceDelta: number;
  isRequired: boolean;
}

export interface MenuVariant {
  id: string;
  nameI18nKey: string;
  priceDelta: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string;
  variants: MenuVariant[];
  modifiers: MenuModifier[];
}

export interface MenuCategory {
  id: string;
  sortOrder: number;
  name: string;
  imageUrl: string | null;
  items: MenuItem[];
}

export interface BootstrapData {
  restaurant: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    tiktokUrl: string | null;
    telegramUrl: string | null;
    xUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    currency: string;
    taxPct: number;
    servicePct: number;
  };
  table: {
    id: string;
    number: number;
    label: string;
  };
  isOpen: boolean;
  sessionState: SessionState;
  sessionId: string | null;
  menu: MenuCategory[];
}

export interface CartItem {
  localId: string;
  menuItemId: string;
  name: string;
  variantId?: string;
  variantNameI18nKey?: string;
  quantity: number;
  modifiers: Array<{
    modifierId: string;
    nameI18nKey: string;
    priceDelta: number;
  }>;
  notes?: string;
  unitPrice: number;
}

export type CustomerTab = "menu" | "cart" | "orders" | "pay";
