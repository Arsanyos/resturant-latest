import { prisma } from "@/lib/db/prisma";

export async function listIngredients(restaurantId: string) {
  return prisma.ingredient.findMany({
    where: { restaurantId },
    orderBy: { name: "asc" },
    include: {
      recipes: {
        include: {
          menuItem: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function getIngredientById(id: string, restaurantId: string) {
  return prisma.ingredient.findFirst({
    where: { id, restaurantId },
  });
}
