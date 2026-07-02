import { PrismaClient, StaffRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const DEFAULT_OPENING_HOURS = {
  monday: { open: "08:00", close: "22:00" },
  tuesday: { open: "08:00", close: "22:00" },
  wednesday: { open: "08:00", close: "22:00" },
  thursday: { open: "08:00", close: "22:00" },
  friday: { open: "08:00", close: "23:00" },
  saturday: { open: "09:00", close: "23:00" },
  sunday: { open: "09:00", close: "21:00" },
};

async function main() {
  const passwordHash = await bcrypt.hash("password", 10);

  await prisma.platformAdmin.upsert({
    where: { email: "admin@platform.test" },
    update: {},
    create: {
      name: "Platform Admin",
      email: "admin@platform.test",
      passwordHash,
    },
  });

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "bole-cafe" },
    update: {
      instagramUrl: "https://instagram.com",
      facebookUrl: "https://facebook.com",
      telegramUrl: "https://t.me",
    },
    create: {
      slug: "bole-cafe",
      name: "Bole Cafe",
      primaryColor: "#F97316",
      secondaryColor: "#111827",
      openingHours: DEFAULT_OPENING_HOURS,
      instagramUrl: "https://instagram.com",
      facebookUrl: "https://facebook.com",
      telegramUrl: "https://t.me",
    },
  });

  for (let i = 1; i <= 12; i++) {
    await prisma.table.upsert({
      where: {
        restaurantId_number: {
          restaurantId: restaurant.id,
          number: i,
        },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        number: i,
        label: `Table ${i}`,
        qrToken: randomBytes(16).toString("hex"),
      },
    });
  }

  const staffAccounts = [
    { name: "Owner", email: "owner@bole.test", role: StaffRole.OWNER },
    { name: "Waiter", email: "waiter@bole.test", role: StaffRole.WAITER },
    { name: "Kitchen", email: "kitchen@bole.test", role: StaffRole.KITCHEN },
    { name: "Cashier", email: "cashier@bole.test", role: StaffRole.CASHIER },
  ];

  for (const account of staffAccounts) {
    await prisma.staff.upsert({
      where: {
        restaurantId_email: {
          restaurantId: restaurant.id,
          email: account.email,
        },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
      },
    });
  }

  const categories = [
    { sortOrder: 1, name: "Traditional" },
    { sortOrder: 2, name: "Grill and Tibs" },
    { sortOrder: 3, name: "Pizza" },
    { sortOrder: 4, name: "Drinks" },
    { sortOrder: 5, name: "Coffee" },
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categories) {
    const existing = await prisma.menuCategory.findFirst({
      where: { restaurantId: restaurant.id, name: cat.name },
    });

    const record =
      existing ??
      (await prisma.menuCategory.create({
        data: {
          restaurantId: restaurant.id,
          sortOrder: cat.sortOrder,
          name: cat.name,
        },
      }));

    categoryMap[cat.name] = record.id;
  }

  const placeholderImage = "/images/menu-placeholder.svg";

  const menuItems = [
    {
      categoryName: "Traditional",
      name: "Doro Wat",
      description: "Spicy chicken stew with berbere sauce, served with injera.",
      basePrice: 380,
      modifiers: [
        { nameI18nKey: "modifier.extra_injera", priceDelta: 30 },
        { nameI18nKey: "modifier.extra_egg", priceDelta: 25 },
      ],
    },
    {
      categoryName: "Traditional",
      name: "Shiro",
      description: "Chickpea flour stew with spices.",
      basePrice: 220,
    },
    {
      categoryName: "Grill and Tibs",
      name: "Kitfo",
      description: "Minced beef tartare with mitmita and niter kibbeh.",
      basePrice: 520,
    },
    {
      categoryName: "Pizza",
      name: "Margherita Pizza",
      description: "Tomato, mozzarella, and fresh basil.",
      basePrice: 350,
      variants: [
        { nameI18nKey: "variant.small", priceDelta: 0 },
        { nameI18nKey: "variant.medium", priceDelta: 80 },
        { nameI18nKey: "variant.large", priceDelta: 150 },
      ],
    },
    {
      categoryName: "Coffee",
      name: "Macchiato",
      description: "Ethiopian espresso with a touch of steamed milk.",
      basePrice: 70,
    },
  ];

  for (const item of menuItems) {
    const existing = await prisma.menuItem.findFirst({
      where: {
        categoryId: categoryMap[item.categoryName],
        name: item.name,
      },
    });

    if (existing) continue;

    const menuItem = await prisma.menuItem.create({
      data: {
        categoryId: categoryMap[item.categoryName],
        name: item.name,
        description: item.description,
        basePrice: item.basePrice,
        imageUrl: placeholderImage,
      },
    });

    if (item.modifiers) {
      for (const mod of item.modifiers) {
        await prisma.menuModifier.create({
          data: {
            menuItemId: menuItem.id,
            nameI18nKey: mod.nameI18nKey,
            priceDelta: mod.priceDelta,
          },
        });
      }
    }

    if (item.variants) {
      for (const variant of item.variants) {
        await prisma.menuItemVariant.create({
          data: {
            menuItemId: menuItem.id,
            nameI18nKey: variant.nameI18nKey,
            priceDelta: variant.priceDelta,
          },
        });
      }
    }
  }

  const doroWat = await prisma.menuItem.findFirst({
    where: {
      name: "Doro Wat",
      category: { restaurantId: restaurant.id },
    },
  });

  const berbere = await prisma.ingredient.upsert({
    where: {
      id: "seed-berbere",
    },
    create: {
      id: "seed-berbere",
      restaurantId: restaurant.id,
      name: "Berbere",
      stock: 50,
      unit: "kg",
      lowStockThreshold: 5,
    },
    update: {},
  });

  const chicken = await prisma.ingredient.upsert({
    where: {
      id: "seed-chicken",
    },
    create: {
      id: "seed-chicken",
      restaurantId: restaurant.id,
      name: "Chicken",
      stock: 30,
      unit: "kg",
      lowStockThreshold: 3,
    },
    update: {},
  });

  if (doroWat) {
    const existingBerbereRecipe = await prisma.recipe.findFirst({
      where: { menuItemId: doroWat.id, ingredientId: berbere.id },
    });
    if (!existingBerbereRecipe) {
      await prisma.recipe.create({
        data: {
          menuItemId: doroWat.id,
          ingredientId: berbere.id,
          quantityNeeded: 0.5,
        },
      });
    }

    const existingChickenRecipe = await prisma.recipe.findFirst({
      where: { menuItemId: doroWat.id, ingredientId: chicken.id },
    });
    if (!existingChickenRecipe) {
      await prisma.recipe.create({
        data: {
          menuItemId: doroWat.id,
          ingredientId: chicken.id,
          quantityNeeded: 1,
        },
      });
    }
  }

  console.log("Seed complete: Bole Cafe with 12 tables, 4 staff, menu items, and ingredients.");
  console.log("Platform admin: admin@platform.test / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
