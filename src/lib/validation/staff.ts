import { z } from "zod";

export const staffLoginSchema = z.object({
  restaurantSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
