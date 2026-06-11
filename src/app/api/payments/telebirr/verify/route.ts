import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError, requireStaff } from "@/lib/auth/require-staff";
import { PaymentError, verifyTelebirrTransaction } from "@/lib/payments/service";
import { verifyTelebirrSchema } from "@/lib/validation/payment";

export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff({ action: "access_cashier" });
    const body = await request.json();
    const input = verifyTelebirrSchema.parse(body);
    const result = await verifyTelebirrTransaction(input, staff);
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
    console.error("Verify Telebirr error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
