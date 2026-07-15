import { prisma } from "@/lib/db/prisma";

export async function getRestaurantBySlug(slug: string) {
  return prisma.restaurant.findUnique({
    where: { slug },
  });
}

export async function getTableByRestaurantAndNumber(
  restaurantId: string,
  tableNumber: number
) {
  return prisma.table.findUnique({
    where: {
      restaurantId_number: {
        restaurantId,
        number: tableNumber,
      },
    },
  });
}

export async function getMenuForBootstrap(restaurantId: string) {
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        orderBy: { name: "asc" },
        include: {
          variants: true,
          modifiers: true,
        },
      },
    },
  });

  return categories
    .filter((category) => category.items.length > 0)
    .map((category) => ({
      id: category.id,
      sortOrder: category.sortOrder,
      name: category.name,
      imageUrl: category.imageUrl,
      items: category.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        basePrice: Number(item.basePrice),
        imageUrl: item.imageUrl,
        available: item.manualAvailable && item.derivedAvailable,
        variants: item.variants.map((v) => ({
          id: v.id,
          nameI18nKey: v.nameI18nKey,
          priceDelta: Number(v.priceDelta),
        })),
        modifiers: item.modifiers.map((m) => ({
          id: m.id,
          nameI18nKey: m.nameI18nKey,
          priceDelta: Number(m.priceDelta),
          isRequired: m.isRequired,
        })),
      })),
    }));
}
