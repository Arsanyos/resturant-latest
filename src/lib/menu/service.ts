import { prisma } from "@/lib/db/prisma";
import type { StaffSessionData } from "@/lib/auth/session";
import type { z } from "zod";
import type {
  createCategorySchema,
  createMenuItemSchema,
  reorderCategoriesSchema,
  updateCategorySchema,
  updateMenuItemSchema,
} from "@/lib/validation/menu";

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

export class MenuError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "MenuError";
  }
}

function serializeMenuItem(item: {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: { toString(): string };
  imageUrl: string;
  manualAvailable: boolean;
  derivedAvailable: boolean;
  variants: Array<{
    id: string;
    nameI18nKey: string;
    priceDelta: { toString(): string };
  }>;
  modifiers: Array<{
    id: string;
    nameI18nKey: string;
    priceDelta: { toString(): string };
    isRequired: boolean;
  }>;
}) {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description,
    basePrice: Number(item.basePrice),
    imageUrl: item.imageUrl,
    manualAvailable: item.manualAvailable,
    derivedAvailable: item.derivedAvailable,
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
  };
}

function serializeCategory(cat: {
  id: string;
  sortOrder: number;
  name: string;
  imageUrl: string | null;
  isActive: boolean;
  items: Parameters<typeof serializeMenuItem>[0][];
}) {
  return {
    id: cat.id,
    sortOrder: cat.sortOrder,
    name: cat.name,
    imageUrl: cat.imageUrl,
    isActive: cat.isActive,
    items: cat.items.map(serializeMenuItem),
  };
}

async function assertUniqueItemName(
  restaurantId: string,
  categoryId: string,
  name: string,
  excludeItemId?: string
) {
  const existing = await prisma.menuItem.findFirst({
    where: {
      categoryId,
      name: { equals: name, mode: "insensitive" },
      category: { restaurantId },
      ...(excludeItemId ? { id: { not: excludeItemId } } : {}),
    },
  });

  if (existing) {
    throw new MenuError("An item with this name already exists in this category");
  }
}

async function nextCategorySortOrder(restaurantId: string) {
  const last = await prisma.menuCategory.findFirst({
    where: { restaurantId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? 0) + 1;
}

export async function getFullMenu(restaurantId: string) {
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        orderBy: { name: "asc" },
        include: { variants: true, modifiers: true },
      },
    },
  });

  return {
    categories: categories.map(serializeCategory),
  };
}

export async function createCategory(
  restaurantId: string,
  input: CreateCategoryInput,
  staff: StaffSessionData
) {
  const sortOrder =
    input.sortOrder ?? (await nextCategorySortOrder(restaurantId));

  const category = await prisma.menuCategory.create({
    data: {
      restaurantId,
      sortOrder,
      name: input.name,
      imageUrl: input.imageUrl ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      restaurantId,
      entityType: "MenuCategory",
      entityId: category.id,
      action: "OWNER_CREATED_CATEGORY",
      actorType: "STAFF",
      actorStaffId: staff.staffId,
      payloadJson: { name: input.name },
    },
  });

  return category;
}

export async function updateCategory(
  categoryId: string,
  input: UpdateCategoryInput,
  staff: StaffSessionData
) {
  const existing = await prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId: staff.restaurantId },
  });

  if (!existing) {
    throw new MenuError("Category not found", 404);
  }

  const category = await prisma.menuCategory.update({
    where: { id: categoryId },
    data: {
      name: input.name,
      sortOrder: input.sortOrder,
      imageUrl: input.imageUrl,
      isActive: input.isActive,
    },
  });

  await prisma.auditLog.create({
    data: {
      restaurantId: staff.restaurantId,
      entityType: "MenuCategory",
      entityId: categoryId,
      action: "OWNER_UPDATED_CATEGORY",
      actorType: "STAFF",
      actorStaffId: staff.staffId,
      payloadJson: { ...input },
    },
  });

  return category;
}

export async function deleteCategory(
  categoryId: string,
  staff: StaffSessionData
) {
  const existing = await prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId: staff.restaurantId },
    include: { items: { select: { id: true } } },
  });

  if (!existing) {
    throw new MenuError("Category not found", 404);
  }

  if (existing.items.length > 0) {
    const category = await prisma.menuCategory.update({
      where: { id: categoryId },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: staff.restaurantId,
        entityType: "MenuCategory",
        entityId: categoryId,
        action: "OWNER_DISABLED_CATEGORY",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: { isActive: false },
      },
    });

    return { id: category.id, isActive: category.isActive, disabled: true };
  }

  await prisma.menuCategory.delete({ where: { id: categoryId } });

  await prisma.auditLog.create({
    data: {
      restaurantId: staff.restaurantId,
      entityType: "MenuCategory",
      entityId: categoryId,
      action: "OWNER_DELETED_CATEGORY",
      actorType: "STAFF",
      actorStaffId: staff.staffId,
      payloadJson: {},
    },
  });

  return { id: categoryId, deleted: true };
}

export async function reorderCategories(
  restaurantId: string,
  input: ReorderCategoriesInput,
  staff: StaffSessionData
) {
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId },
    select: { id: true },
  });

  const knownIds = new Set(categories.map((c) => c.id));
  if (
    input.categoryIds.length !== categories.length ||
    input.categoryIds.some((id) => !knownIds.has(id))
  ) {
    throw new MenuError("Invalid category order");
  }

  await prisma.$transaction(
    input.categoryIds.map((id, index) =>
      prisma.menuCategory.update({
        where: { id },
        data: { sortOrder: index + 1 },
      })
    )
  );

  await prisma.auditLog.create({
    data: {
      restaurantId,
      entityType: "MenuCategory",
      entityId: restaurantId,
      action: "OWNER_REORDERED_CATEGORIES",
      actorType: "STAFF",
      actorStaffId: staff.staffId,
      payloadJson: { categoryIds: input.categoryIds },
    },
  });

  return { ok: true };
}

export async function createMenuItem(
  restaurantId: string,
  input: CreateMenuItemInput,
  staff: StaffSessionData
) {
  const category = await prisma.menuCategory.findFirst({
    where: { id: input.categoryId, restaurantId },
  });

  if (!category) {
    throw new MenuError("Category not found", 404);
  }

  await assertUniqueItemName(restaurantId, input.categoryId, input.name);

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.menuItem.create({
      data: {
        categoryId: input.categoryId,
        name: input.name,
        description: input.description ?? null,
        basePrice: input.basePrice,
        imageUrl: input.imageUrl,
      },
    });

    for (const variant of input.variants) {
      await tx.menuItemVariant.create({
        data: {
          menuItemId: created.id,
          nameI18nKey: variant.nameI18nKey,
          priceDelta: variant.priceDelta,
        },
      });
    }

    for (const modifier of input.modifiers) {
      await tx.menuModifier.create({
        data: {
          menuItemId: created.id,
          nameI18nKey: modifier.nameI18nKey,
          priceDelta: modifier.priceDelta,
          isRequired: modifier.isRequired,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        restaurantId,
        entityType: "MenuItem",
        entityId: created.id,
        action: "OWNER_CREATED_MENU_ITEM",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: { name: input.name },
      },
    });

    return created;
  });

  const full = await prisma.menuItem.findUnique({
    where: { id: item.id },
    include: { variants: true, modifiers: true },
  });

  return serializeMenuItem(full!);
}

export async function updateMenuItem(
  itemId: string,
  input: UpdateMenuItemInput,
  staff: StaffSessionData
) {
  const existing = await prisma.menuItem.findFirst({
    where: {
      id: itemId,
      category: { restaurantId: staff.restaurantId },
    },
  });

  if (!existing) {
    throw new MenuError("Menu item not found", 404);
  }

  const targetCategoryId = input.categoryId ?? existing.categoryId;

  if (input.categoryId) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: input.categoryId, restaurantId: staff.restaurantId },
    });
    if (!category) {
      throw new MenuError("Category not found", 404);
    }
  }

  if (input.name) {
    await assertUniqueItemName(
      staff.restaurantId,
      targetCategoryId,
      input.name,
      itemId
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.menuItem.update({
      where: { id: itemId },
      data: {
        name: input.name,
        description: input.description,
        basePrice: input.basePrice,
        imageUrl: input.imageUrl,
        manualAvailable: input.manualAvailable,
        categoryId: input.categoryId,
      },
    });

    if (input.modifiers) {
      await tx.menuModifier.deleteMany({ where: { menuItemId: itemId } });
      for (const modifier of input.modifiers) {
        await tx.menuModifier.create({
          data: {
            menuItemId: itemId,
            nameI18nKey: modifier.nameI18nKey,
            priceDelta: modifier.priceDelta,
            isRequired: modifier.isRequired,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        restaurantId: staff.restaurantId,
        entityType: "MenuItem",
        entityId: itemId,
        action: "OWNER_UPDATED_MENU_ITEM",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: { ...input },
      },
    });
  });

  const full = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: { variants: true, modifiers: true },
  });

  return serializeMenuItem(full!);
}

export async function deleteMenuItem(itemId: string, staff: StaffSessionData) {
  const existing = await prisma.menuItem.findFirst({
    where: {
      id: itemId,
      category: { restaurantId: staff.restaurantId },
    },
  });

  if (!existing) {
    throw new MenuError("Menu item not found", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.menuItem.update({
      where: { id: itemId },
      data: { manualAvailable: false },
    });

    await tx.auditLog.create({
      data: {
        restaurantId: staff.restaurantId,
        entityType: "MenuItem",
        entityId: itemId,
        action: "OWNER_UPDATED_MENU_ITEM",
        actorType: "STAFF",
        actorStaffId: staff.staffId,
        payloadJson: { manualAvailable: false, deleted: true },
      },
    });
  });

  return { id: itemId, manualAvailable: false };
}
