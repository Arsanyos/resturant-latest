import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError, requireStaff } from "@/lib/auth/require-staff";
import { finalizePayment, PaymentError } from "@/lib/payments/service";
import { finalizePaymentSchema } from "@/lib/validation/payment";

export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff({ action: "access_cashier" });
    const body = await request.json();
    const input = finalizePaymentSchema.parse(body);
    const result = await finalizePayment(input.paymentId, staff);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Finalize payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
