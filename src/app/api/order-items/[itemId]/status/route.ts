import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireStaff, StaffAuthError } from "@/lib/auth/require-staff";
import { updateOrderItemStatus, KitchenError } from "@/lib/kitchen/service";
import { updateOrderItemStatusSchema } from "@/lib/validation/order";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const staff = await requireStaff({ action: "access_kitchen" });
    const { itemId } = await context.params;
    const body = await request.json();
    const input = updateOrderItemStatusSchema.parse(body);

    const updated = await updateOrderItemStatus(
      itemId,
      input.status,
      staff
    );

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof KitchenError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Update order item status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
