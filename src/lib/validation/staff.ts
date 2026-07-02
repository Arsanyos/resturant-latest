import { z } from "zod";

export const staffLoginSchema = z.object({
  restaurantSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;

export const changeStaffPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(128, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangeStaffPasswordInput = z.infer<typeof changeStaffPasswordSchema>;
