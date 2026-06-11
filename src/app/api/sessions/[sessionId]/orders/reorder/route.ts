import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError, requireStaff } from "@/lib/auth/require-staff";
import { OrderError, reorderOrderItem } from "@/lib/orders/service";
import { reorderItemSchema } from "@/lib/validation/waiter";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const staff = await requireStaff({ action: "access_waiter" });
    const { sessionId } = await context.params;
    const body = await request.json();
    const input = reorderItemSchema.parse(body);
    const order = await reorderOrderItem(sessionId, input, staff);

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        nameI18nKey: item.menuItem.nameI18nKey,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        kitchenStatus: item.kitchenStatus,
        modifiersJson: item.modifiersJson,
        notes: item.notes,
      })),
    });
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
    console.error("Reorder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
