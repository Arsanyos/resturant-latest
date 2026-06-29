import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentStaff } from "@/lib/auth/service";
import {
  PaymentError,
  processMockTelebirr,
} from "@/lib/payments/service";
import { mockTelebirrSchema } from "@/lib/validation/payment";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = mockTelebirrSchema.parse(body);
    const staff = await getCurrentStaff();

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
