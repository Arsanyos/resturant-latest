import { prisma } from "@/lib/db/prisma";
import type { StaffSessionData } from "@/lib/auth/session";
import { publishRealtimeEvent } from "@/lib/realtime/publisher";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type {
  CreateIngredientInput,
  CreateRecipeInput,
  UpdateIngredientInput,
} from "@/lib/validation/inventory";
import { listIngredients } from "./queries";

export class InventoryError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

export async function recomputeMenuAvailability(restaurantId: string) {
  const items = await prisma.menuItem.findMany({
    where: { category: { restaurantId } },
    include: {
      recipes: { include: { ingredient: true } },
    },
  });

  const changed: Array<{ menuItemId: string; available: boolean }> = [];

  for (const item of items) {
    let derivedAvailable = true;

    if (item.recipes.length > 0) {
      derivedAvailable = item.recipes.every(
        (recipe) =>
          Number(recipe.ingredient.stock) >= Number(recipe.quantityNeeded)
      );
    }

    if (item.derivedAvailable !== derivedAvailable) {
      await prisma.menuItem.update({
        where: { id: item.id },
        data: { derivedAvailable },
      });
      changed.push({ menuItemId: item.id, available: derivedAvailable });
    }
  }

  for (const change of changed) {
    await publishRealtimeEvent({
      event: REALTIME_EVENTS.MENU_AVAILABILITY_CHANGED,
      restaurantId,
      payload: {
        menuItemId: change.menuItemId,
        available: change.available,
      },
    });
  }

  return changed;
}

export async function getInventoryList(restaurantId: string) {
  const ingredients = await listIngredients(restaurantId);
  return {
    ingredients: ingredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      stock: Number(ing.stock),
      unit: ing.unit,
      lowStockThreshold: Number(ing.lowStockThreshold),
      isLowStock: Number(ing.stock) <= Number(ing.lowStockThreshold),
      recipes: ing.recipes.map((r) => ({
        id: r.id,
        menuItemId: r.menuItemId,
        menuItemName: r.menuItem.name,
        quantityNeeded: Number(r.quantityNeeded),
      })),
    })),
  };
}

export async function createIngredient(
  restaurantId: string,
  input: CreateIngredientInput,
  staff: StaffSessionData
) {
  const ingredient = await prisma.$transaction(async (tx) => {
    const record = await tx.ingredient.create({
      data: {
        restaurantId,
        name: input.name,
        stock: input.stock,
        unit: input.unit,
        lowStockThreshold: input.lowStockThreshold,
      },
    });

    await tx.auditLog.create({
      data: {
        restaurantId,
        entityType: "Ingredient",
        entityId: record.id,
        action: "OWNER_CREATED_INGREDIENT",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: { name: input.name, stock: input.stock },
      },
    });

    return record;
  });

  await recomputeMenuAvailability(restaurantId);

  return {
    id: ingredient.id,
    name: ingredient.name,
    stock: Number(ingredient.stock),
    unit: ingredient.unit,
    lowStockThreshold: Number(ingredient.lowStockThreshold),
  };
}

export async function updateIngredient(
  ingredientId: string,
  input: UpdateIngredientInput,
  staff: StaffSessionData
) {
  const existing = await prisma.ingredient.findFirst({
    where: { id: ingredientId, restaurantId: staff.restaurantId },
  });

  if (!existing) {
    throw new InventoryError("Ingredient not found", 404);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.ingredient.update({
      where: { id: ingredientId },
      data: {
        name: input.name,
        stock: input.stock,
        unit: input.unit,
        lowStockThreshold: input.lowStockThreshold,
      },
    });

    await tx.auditLog.create({
      data: {
        restaurantId: staff.restaurantId,
        entityType: "Ingredient",
        entityId: ingredientId,
        action: "OWNER_UPDATED_INGREDIENT",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: {
          before: {
            stock: Number(existing.stock),
            name: existing.name,
          },
          after: {
            stock: input.stock ?? Number(existing.stock),
            name: input.name ?? existing.name,
          },
        },
      },
    });

    return record;
  });

  await recomputeMenuAvailability(staff.restaurantId);

  return {
    id: updated.id,
    name: updated.name,
    stock: Number(updated.stock),
    unit: updated.unit,
    lowStockThreshold: Number(updated.lowStockThreshold),
  };
}

export async function createRecipe(
  input: CreateRecipeInput,
  staff: StaffSessionData
) {
  const menuItem = await prisma.menuItem.findFirst({
    where: {
      id: input.menuItemId,
      category: { restaurantId: staff.restaurantId },
    },
  });
  const ingredient = await prisma.ingredient.findFirst({
    where: { id: input.ingredientId, restaurantId: staff.restaurantId },
  });

  if (!menuItem || !ingredient) {
    throw new InventoryError("Menu item or ingredient not found", 404);
  }

  const recipe = await prisma.recipe.create({
    data: {
      menuItemId: input.menuItemId,
      ingredientId: input.ingredientId,
      quantityNeeded: input.quantityNeeded,
    },
  });

  await recomputeMenuAvailability(staff.restaurantId);

  return {
    id: recipe.id,
    menuItemId: recipe.menuItemId,
    ingredientId: recipe.ingredientId,
    quantityNeeded: Number(recipe.quantityNeeded),
  };
}