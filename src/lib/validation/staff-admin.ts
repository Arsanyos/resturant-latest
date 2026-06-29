import { StaffRole } from "@prisma/client";
import { z } from "zod";

export const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum([
    StaffRole.OWNER,
    StaffRole.WAITER,
    StaffRole.KITCHEN,
    StaffRole.CASHIER,
  ]),
});

export const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  role: z
    .enum([
      StaffRole.OWNER,
      StaffRole.WAITER,
      StaffRole.KITCHEN,
      StaffRole.CASHIER,
    ])
    .optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
