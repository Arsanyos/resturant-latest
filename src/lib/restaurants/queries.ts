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
    where: { restaurantId },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: {
          manualAvailable: true,
          derivedAvailable: true,
        },
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
      i18nKey: category.i18nKey,
      items: category.items.map((item) => ({
        id: item.id,
        nameI18nKey: item.nameI18nKey,
        descriptionI18nKey: item.descriptionI18nKey,
        basePrice: Number(item.basePrice),
        imageUrl: item.imageUrl,
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
