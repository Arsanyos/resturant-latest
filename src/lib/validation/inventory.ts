import { z } from "zod";

export const createIngredientSchema = z.object({
  name: z.string().min(1),
  stock: z.number().min(0),
  unit: z.string().min(1),
  lowStockThreshold: z.number().min(0),
});

export const updateIngredientSchema = createIngredientSchema.partial();

export const createRecipeSchema = z.object({
  menuItemId: z.string().min(1),
  ingredientId: z.string().min(1),
  quantityNeeded: z.number().positive(),
});

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
