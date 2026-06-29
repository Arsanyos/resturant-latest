import { z } from "zod";

export const updateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().min(1).optional(),
  secondaryColor: z.string().min(1).optional(),
  taxPct: z.number().min(0).max(100).optional(),
  servicePct: z.number().min(0).max(100).optional(),
  timezone: z.string().min(1).optional(),
  manualOpen: z.boolean().nullable().optional(),
  openingHours: z.record(
    z.object({ open: z.string(), close: z.string() })
  ).optional(),
  instagramUrl: z.string().url().nullable().optional(),
  facebookUrl: z.string().url().nullable().optional(),
  tiktokUrl: z.string().url().nullable().optional(),
  telegramUrl: z.string().url().nullable().optional(),
  xUrl: z.string().url().nullable().optional(),
});

export const auditLogQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  action: z.string().optional(),
  staffId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional().default(50),
});

export const bulkAssignmentSchema = z.object({
  staffId: z.string().min(1),
  tableIds: z.array(z.string().min(1)),
  shiftDate: z.string().optional(),
});
