import { KitchenStatus } from "@prisma/client";
import { z } from "zod";

export const orderModifierSchema = z.object({
  modifierId: z.string().min(1),
  nameI18nKey: z.string().min(1),
  priceDelta: z.number(),
});

export const placeOrderItemSchema = z.object({
  menuItemId: z.string().min(1),
  variantId: z.string().nullable().optional(),
  quantity: z.number().int().positive(),
  modifiers: z.array(orderModifierSchema).default([]),
  notes: z.string().max(500).optional(),
});

export const placeOrderSchema = z.object({
  items: z.array(placeOrderItemSchema).min(1),
});

export const assistanceRequestSchema = z.object({
  deviceInfo: z.string().max(500).optional(),
  tableId: z.string().optional(),
});

export const kitchenWindowSchema = z.enum(["all", "10", "30", "60"]);

export const updateOrderItemStatusSchema = z.object({
  status: z.enum([
    KitchenStatus.BEING_PREPARED,
    KitchenStatus.SERVED,
  ]),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type PlaceOrderItemInput = z.infer<typeof placeOrderItemSchema>;
export type KitchenWindow = z.infer<typeof kitchenWindowSchema>;
