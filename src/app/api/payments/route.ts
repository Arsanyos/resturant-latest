import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getPaymentBySessionId,
  PaymentError,
} from "@/lib/payments/service";
import { paymentQuerySchema } from "@/lib/validation/payment";

export async function GET(request: NextRequest) {
  try {
    const sessionId = paymentQuerySchema.parse({
      sessionId: request.nextUrl.searchParams.get("sessionId"),
    }).sessionId;

    const payment = await getPaymentBySessionId(sessionId);
    return NextResponse.json({ payment });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Get payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
