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

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "bole-cafe" },
    update: {},
    create: {
      slug: "bole-cafe",
      name: "Bole Cafe",
      primaryColor: "#F97316",
      secondaryColor: "#111827",
      openingHours: DEFAULT_OPENING_HOURS,
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
    { sortOrder: 1, i18nKey: "category.traditional" },
    { sortOrder: 2, i18nKey: "category.grill_and_tibs" },
    { sortOrder: 3, i18nKey: "category.pizza" },
    { sortOrder: 4, i18nKey: "category.drinks" },
    { sortOrder: 5, i18nKey: "category.coffee" },
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categories) {
    const existing = await prisma.menuCategory.findFirst({
      where: { restaurantId: restaurant.id, i18nKey: cat.i18nKey },
    });

    const record =
      existing ??
      (await prisma.menuCategory.create({
        data: {
          restaurantId: restaurant.id,
          sortOrder: cat.sortOrder,
          i18nKey: cat.i18nKey,
        },
      }));

    categoryMap[cat.i18nKey] = record.id;
  }

  const menuItems = [
    {
      categoryKey: "category.traditional",
      nameI18nKey: "menu.doro_wat",
      descriptionI18nKey: "menu.doro_wat_desc",
      basePrice: 380,
      modifiers: [
        { nameI18nKey: "modifier.extra_injera", priceDelta: 30 },
        { nameI18nKey: "modifier.extra_egg", priceDelta: 25 },
      ],
    },
    {
      categoryKey: "category.traditional",
      nameI18nKey: "menu.shiro",
      descriptionI18nKey: "menu.shiro_desc",
      basePrice: 220,
    },
    {
      categoryKey: "category.grill_and_tibs",
      nameI18nKey: "menu.kitfo",
      descriptionI18nKey: "menu.kitfo_desc",
      basePrice: 520,
    },
    {
      categoryKey: "category.pizza",
      nameI18nKey: "menu.margherita",
      descriptionI18nKey: "menu.margherita_desc",
      basePrice: 350,
      variants: [
        { nameI18nKey: "variant.small", priceDelta: 0 },
        { nameI18nKey: "variant.medium", priceDelta: 80 },
        { nameI18nKey: "variant.large", priceDelta: 150 },
      ],
    },
    {
      categoryKey: "category.coffee",
      nameI18nKey: "menu.macchiato",
      descriptionI18nKey: "menu.macchiato_desc",
      basePrice: 70,
    },
  ];

  for (const item of menuItems) {
    const existing = await prisma.menuItem.findFirst({
      where: {
        categoryId: categoryMap[item.categoryKey],
        nameI18nKey: item.nameI18nKey,
      },
    });

    if (existing) continue;

    const menuItem = await prisma.menuItem.create({
      data: {
        categoryId: categoryMap[item.categoryKey],
        nameI18nKey: item.nameI18nKey,
        descriptionI18nKey: item.descriptionI18nKey,
        basePrice: item.basePrice,
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

  console.log("Seed complete: Bole Cafe with 12 tables, 4 staff, and menu items.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
