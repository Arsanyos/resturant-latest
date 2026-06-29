import { z } from "zod";

export const createTableSchema = z.object({
  number: z.number().int().positive().optional(),
  label: z.string().min(1),
  capacity: z.number().int().positive().optional().default(4),
});

export const updateTableSchema = z.object({
  label: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
