import { z } from "zod";

export const createSessionSchema = z.object({
  restaurantSlug: z.string().min(1),
  tableNumber: z.coerce.number().int().positive(),
});

export const bootstrapQuerySchema = z.object({
  deviceToken: z.string().min(1).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type BootstrapQueryInput = z.infer<typeof bootstrapQuerySchema>;

export type SessionState =
  | "none"
  | "active_same_device"
  | "active_blocked_device"
  | "waiter_started";
