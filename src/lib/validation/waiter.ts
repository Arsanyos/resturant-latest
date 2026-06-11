import { AssistanceStatus } from "@prisma/client";
import { z } from "zod";

export const staffAssignmentSchema = z.object({
  tableId: z.string().min(1),
  staffId: z.string().min(1).optional(),
});

export const waiterSessionSchema = z.object({
  restaurantSlug: z.string().min(1),
  tableNumber: z.coerce.number().int().positive(),
});

export const assistanceUpdateSchema = z.object({
  status: z.enum([AssistanceStatus.ACKNOWLEDGED, AssistanceStatus.RESOLVED]),
});

export const cancelOrderItemSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const reorderItemSchema = z.object({
  sourceOrderItemId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

export type StaffAssignmentInput = z.infer<typeof staffAssignmentSchema>;
export type WaiterSessionInput = z.infer<typeof waiterSessionSchema>;
export type AssistanceUpdateInput = z.infer<typeof assistanceUpdateSchema>;
export type CancelOrderItemInput = z.infer<typeof cancelOrderItemSchema>;
export type ReorderItemInput = z.infer<typeof reorderItemSchema>;
