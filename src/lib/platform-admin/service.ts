import { randomBytes } from "crypto";
import { Prisma, StaffRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import type { PlatformSessionData } from "@/lib/auth/platform-session";
import type {
  CreateTenantInput,
  ResetTenantOwnerPasswordInput,
  UpdateTenantInput,
} from "@/lib/validation/platform-tenant";

const DEFAULT_OPENING_HOURS = {
  monday: { open: "08:00", close: "22:00" },
  tuesday: { open: "08:00", close: "22:00" },
  wednesday: { open: "08:00", close: "22:00" },
  thursday: { open: "08:00", close: "22:00" },
  friday: { open: "08:00", close: "23:00" },
  saturday: { open: "09:00", close: "23:00" },
  sunday: { open: "09:00", close: "21:00" },
};

const STARTER_MENU: {
  name: string;
  items: { name: string; description: string; basePrice: number }[];
}[] = [
  {
    name: "Food",
    items: [
      {
        name: "Signature Dish",
        description: "A house specialty to get you started.",
        basePrice: 250,
      },
    ],
  },
  {
    name: "Drinks",
    items: [
      {
        name: "Coffee",
        description: "Freshly brewed coffee.",
        basePrice: 70,
      },
    ],
  },
];

const STARTER_IMAGE = "/images/menu-placeholder.svg";

export class PlatformTenantError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "PlatformTenantError";
  }
}

export async function createTenant(
  input: CreateTenantInput,
  admin: PlatformSessionData
) {
  const existingSlug = await prisma.restaurant.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });

  if (existingSlug) {
    throw new PlatformTenantError("Slug already in use", 409);
  }

  const ownerPasswordHash = await hashPassword(input.owner.password);

  try {
    const tenant = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          slug: input.slug,
          name: input.name,
          tenantType: input.tenantType,
          currency: input.currency,
          timezone: input.timezone,
          primaryColor: input.primaryColor,
          secondaryColor: input.secondaryColor,
          logoUrl: input.logoUrl ?? null,
          subscriptionPlan: input.subscriptionPlan ?? null,
          notes: input.notes ?? null,
          openingHours: DEFAULT_OPENING_HOURS,
        },
      });

      await tx.staff.create({
        data: {
          restaurantId: restaurant.id,
          name: input.owner.name,
          email: input.owner.email,
          passwordHash: ownerPasswordHash,
          role: StaffRole.OWNER,
        },
      });

      if (input.setup.seedDefaultTables && input.setup.defaultTableCount > 0) {
        await tx.table.createMany({
          data: Array.from(
            { length: input.setup.defaultTableCount },
            (_, i) => ({
              restaurantId: restaurant.id,
              number: i + 1,
              label: `Table ${i + 1}`,
              qrToken: randomBytes(16).toString("hex"),
            })
          ),
        });
      }

      if (input.setup.seedStarterMenu) {
        let sortOrder = 1;
        for (const category of STARTER_MENU) {
          const createdCategory = await tx.menuCategory.create({
            data: {
              restaurantId: restaurant.id,
              sortOrder: sortOrder++,
              name: category.name,
            },
          });

          for (const item of category.items) {
            await tx.menuItem.create({
              data: {
                categoryId: createdCategory.id,
                name: item.name,
                description: item.description,
                basePrice: item.basePrice,
                imageUrl: STARTER_IMAGE,
              },
            });
          }
        }
      }

      await tx.platformAuditLog.create({
        data: {
          platformAdminId: admin.platformAdminId,
          entityType: "Restaurant",
          entityId: restaurant.id,
          action: "PLATFORM_CREATED_TENANT",
          payloadJson: {
            slug: restaurant.slug,
            name: restaurant.name,
            tenantType: restaurant.tenantType,
            ownerEmail: input.owner.email,
            seededTables: input.setup.seedDefaultTables
              ? input.setup.defaultTableCount
              : 0,
            seededStarterMenu: input.setup.seedStarterMenu,
          },
        },
      });

      return restaurant;
    });

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      tenantType: tenant.tenantType,
      onboardingStatus: tenant.onboardingStatus,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new PlatformTenantError("Slug or owner email already in use", 409);
    }
    throw error;
  }
}

export async function updateTenant(
  tenantId: string,
  input: UpdateTenantInput,
  admin: PlatformSessionData
) {
  const existing = await prisma.restaurant.findUnique({
    where: { id: tenantId },
  });

  if (!existing) {
    throw new PlatformTenantError("Tenant not found", 404);
  }

  const before = {
    name: existing.name,
    tenantType: existing.tenantType,
    onboardingStatus: existing.onboardingStatus,
    isActive: existing.isActive,
    primaryColor: existing.primaryColor,
    secondaryColor: existing.secondaryColor,
    logoUrl: existing.logoUrl,
    subscriptionPlan: existing.subscriptionPlan,
  };

  const isActive =
    input.onboardingStatus !== undefined
      ? input.onboardingStatus === "ACTIVE" ||
        input.onboardingStatus === "DRAFT"
      : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.restaurant.update({
      where: { id: tenantId },
      data: {
        name: input.name,
        tenantType: input.tenantType,
        onboardingStatus: input.onboardingStatus,
        isActive,
        subscriptionPlan: input.subscriptionPlan,
        notes: input.notes,
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        instagramUrl: input.instagramUrl,
        facebookUrl: input.facebookUrl,
        tiktokUrl: input.tiktokUrl,
        telegramUrl: input.telegramUrl,
        xUrl: input.xUrl,
      },
    });

    await tx.platformAuditLog.create({
      data: {
        platformAdminId: admin.platformAdminId,
        entityType: "Restaurant",
        entityId: tenantId,
        action: "PLATFORM_UPDATED_TENANT",
        payloadJson: {
          before,
          after: input as Record<string, unknown>,
        } as Prisma.InputJsonValue,
      },
    });

    return record;
  });

  return {
    id: updated.id,
    slug: updated.slug,
    name: updated.name,
    tenantType: updated.tenantType,
    onboardingStatus: updated.onboardingStatus,
    isActive: updated.isActive,
  };
}

export async function resetTenantOwnerPassword(
  tenantId: string,
  input: ResetTenantOwnerPasswordInput,
  admin: PlatformSessionData
) {
  const tenant = await prisma.restaurant.findUnique({
    where: { id: tenantId },
    select: { id: true, slug: true, name: true },
  });

  if (!tenant) {
    throw new PlatformTenantError("Tenant not found", 404);
  }

  const owner = await prisma.staff.findFirst({
    where: {
      restaurantId: tenantId,
      role: StaffRole.OWNER,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true },
  });

  if (!owner) {
    throw new PlatformTenantError("Tenant owner not found", 404);
  }

  const passwordHash = await hashPassword(input.newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.staff.update({
      where: { id: owner.id },
      data: { passwordHash },
    });

    await tx.platformAuditLog.create({
      data: {
        platformAdminId: admin.platformAdminId,
        entityType: "Staff",
        entityId: owner.id,
        action: "PLATFORM_RESET_OWNER_PASSWORD",
        payloadJson: {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
          ownerEmail: owner.email,
        },
      },
    });
  });

  return {
    owner: {
      id: owner.id,
      name: owner.name,
      email: owner.email,
    },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
    },
  };
}
