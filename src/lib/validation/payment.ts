import { z } from "zod";

export const cashTransactionSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive(),
  cashTendered: z.number().positive(),
});

export const finalizePaymentSchema = z.object({
  paymentId: z.string().min(1),
});

export const mockTelebirrSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive(),
  billRefNumber: z.string().min(1).max(100),
  simulateFailure: z.boolean().optional().default(false),
});

export const verifyTelebirrSchema = z.object({
  transactionId: z.string().min(1),
  verified: z.boolean(),
});

export const paymentQuerySchema = z.object({
  sessionId: z.string().min(1),
});

export type CashTransactionInput = z.infer<typeof cashTransactionSchema>;
export type FinalizePaymentInput = z.infer<typeof finalizePaymentSchema>;
export type MockTelebirrInput = z.infer<typeof mockTelebirrSchema>;
export type VerifyTelebirrInput = z.infer<typeof verifyTelebirrSchema>;
