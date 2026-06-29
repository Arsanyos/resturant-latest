import { z } from "zod";

export const mockTipTelebirrSchema = z.object({
  sessionId: z.string().min(1),
  amount: z.number().positive(),
  billRefNumber: z.string().min(1).max(100),
  simulateFailure: z.boolean().optional().default(false),
});

export type MockTipTelebirrInput = z.infer<typeof mockTipTelebirrSchema>;

export const tipAvailabilitySchema = z.object({
  sessionId: z.string().min(1),
});
