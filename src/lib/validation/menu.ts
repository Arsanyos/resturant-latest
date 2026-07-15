import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
  imageUrl: z.string().min(1).optional().nullable(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  imageUrl: z.string().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const reorderCategoriesSchema = z.object({
  categoryIds: z.array(z.string().min(1)).min(1),
});

export const menuModifierInputSchema = z.object({
  nameI18nKey: z.string().min(1),
  priceDelta: z.number(),
  isRequired: z.boolean().optional().default(false),
});

export const menuVariantInputSchema = z.object({
  nameI18nKey: z.string().min(1),
  priceDelta: z.number(),
});

export const createMenuItemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  basePrice: z.number(),
  imageUrl: z.string().min(1),
  variants: z.array(menuVariantInputSchema).optional().default([]),
  modifiers: z.array(menuModifierInputSchema).optional().default([]),
});

export const updateMenuItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  basePrice: z.number().optional(),
  imageUrl: z.string().min(1).optional(),
  manualAvailable: z.boolean().optional(),
  categoryId: z.string().min(1).optional(),
  modifiers: z.array(menuModifierInputSchema).optional(),
});

export const setMenuItemAvailabilitySchema = z.object({
  manualAvailable: z.boolean(),
});
