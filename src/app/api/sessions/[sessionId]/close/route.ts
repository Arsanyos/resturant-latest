import { NextRequest, NextResponse } from "next/server";
import { StaffAuthError, requireStaff } from "@/lib/auth/require-staff";
import { prisma } from "@/lib/db/prisma";
import { finalizePayment, PaymentError } from "@/lib/payments/service";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const staff = await requireStaff({ action: "access_cashier" });
    const { sessionId } = await context.params;

    const payment = await prisma.payment.findUnique({
      where: { sessionId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const result = await finalizePayment(payment.id, staff);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Session close error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
