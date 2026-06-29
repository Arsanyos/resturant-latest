import type { KitchenStatus } from "@prisma/client";
import type { KitchenWindow } from "@/lib/validation/order";

export interface KdsOrderItem {
  orderItemId: string;
  name: string;
  quantity: number;
  variantNameI18nKey: string | null;
  modifiers: Array<{ nameI18nKey: string; priceDelta: number }>;
  notes: string | null;
  kitchenStatus: KitchenStatus;
  cancelReason: string | null;
}

export interface KdsOrder {
  orderId: string;
  orderNumber: number;
  createdAt: string;
  items: KdsOrderItem[];
}

export interface KdsTable {
  tableId: string;
  tableNumber: number;
  tableLabel: string;
  sessionId: string;
  orders: KdsOrder[];
}

export interface KdsData {
  tables: KdsTable[];
}

export interface ActivityEntry {
  id: string;
  action: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

export type { KitchenWindow };
