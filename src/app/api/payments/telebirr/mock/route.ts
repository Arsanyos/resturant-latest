import { NextRequest, NextResponse } from "next/server";
import { StartedByType } from "@prisma/client";
import { ZodError } from "zod";
import { getCurrentStaff } from "@/lib/auth/service";
import {
  PaymentError,
  processMockTelebirr,
} from "@/lib/payments/service";
import { loadPaymentWithContext } from "@/lib/payments/queries";
import { verifyDeviceToken } from "@/lib/sessions/queries";
import { mockTelebirrSchema } from "@/lib/validation/payment";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = mockTelebirrSchema.parse(body);
    const staff = await getCurrentStaff();

    if (!staff) {
      const payment = await loadPaymentWithContext(input.paymentId);
      if (!payment) {
        throw new PaymentError("Payment not found", 404);
      }
      const session = payment.session;
      if (session.startedByType === StartedByType.CUSTOMER) {
        const deviceToken = request.headers.get("x-device-token");
        if (!deviceToken) {
          throw new PaymentError("Device token required", 401);
        }
        const valid = await verifyDeviceToken(
          deviceToken,
          session.deviceTokenHash
        );
        if (!valid) {
          throw new PaymentError("Invalid device token", 403);
        }
      }
    }

    const result = await processMockTelebirr(
      input,
      staff
        ? { actorStaffId: staff.staffId, actorType: "STAFF" }
        : { actorType: "CUSTOMER" }
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Mock Telebirr error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
