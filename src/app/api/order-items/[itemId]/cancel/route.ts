import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError, requireStaff } from "@/lib/auth/require-staff";
import { cancelOrderItem, OrderError } from "@/lib/orders/service";
import { cancelOrderItemSchema } from "@/lib/validation/waiter";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const staff = await requireStaff({ action: "access_waiter" });
    const { itemId } = await context.params;
    const body = await request.json();
    const input = cancelOrderItemSchema.parse(body);
    const result = await cancelOrderItem(itemId, input, staff);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Cancel order item error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
