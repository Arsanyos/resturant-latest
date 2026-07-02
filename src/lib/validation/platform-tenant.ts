import { z } from "zod";
import { TenantStatus, TenantType } from "@prisma/client";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hexColorRegex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const optionalUrl = z
  .string()
  .trim()
  .url()
  .or(z.literal(""))
  .nullish()
  .transform((value) => (value ? value : null));

export const createTenantSchema = z.object({
  name: z.string().trim().min(1, "Business name is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(60)
    .regex(slugRegex, "Use lowercase letters, numbers, and hyphens only"),
  tenantType: z.nativeEnum(TenantType).default(TenantType.CAFE),
  currency: z.string().trim().min(1).default("ETB"),
  timezone: z.string().trim().min(1).default("Africa/Addis_Ababa"),
  primaryColor: z.string().regex(hexColorRegex, "Invalid color").default("#F97316"),
  secondaryColor: z
    .string()
    .regex(hexColorRegex, "Invalid color")
    .default("#111827"),
  logoUrl: optionalUrl,
  subscriptionPlan: z.string().trim().min(1).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  owner: z.object({
    name: z.string().trim().min(1, "Owner name is required"),
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
  setup: z
    .object({
      seedDefaultTables: z.boolean().default(true),
      defaultTableCount: z.number().int().min(0).max(200).default(12),
      seedStarterMenu: z.boolean().default(false),
    })
    .default({
      seedDefaultTables: true,
      defaultTableCount: 12,
      seedStarterMenu: false,
    }),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = z.object({
  name: z.string().trim().min(1).optional(),
  tenantType: z.nativeEnum(TenantType).optional(),
  onboardingStatus: z.nativeEnum(TenantStatus).optional(),
  subscriptionPlan: z.string().trim().min(1).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  logoUrl: optionalUrl,
  primaryColor: z.string().regex(hexColorRegex, "Invalid color").optional(),
  secondaryColor: z.string().regex(hexColorRegex, "Invalid color").optional(),
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  telegramUrl: optionalUrl,
  xUrl: optionalUrl,
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export const resetTenantOwnerPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password is too long"),
});

export type ResetTenantOwnerPasswordInput = z.infer<
  typeof resetTenantOwnerPasswordSchema
>;
