import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentStaff } from "@/lib/auth/service";
import {
  listSessionOrders,
  OrderError,
  placeOrder,
} from "@/lib/orders/service";
import { placeOrderSchema } from "@/lib/validation/order";

function getDeviceToken(request: NextRequest): string | undefined {
  return request.headers.get("x-device-token") ?? undefined;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const deviceToken = getDeviceToken(request);
    const staff = deviceToken ? undefined : (await getCurrentStaff()) ?? undefined;
    const data = await listSessionOrders(sessionId, {
      deviceToken,
      staff,
    });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("List orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    const input = placeOrderSchema.parse(body);
    const deviceToken = getDeviceToken(request);
    const staff = deviceToken ? undefined : (await getCurrentStaff()) ?? undefined;
    const order = await placeOrder(sessionId, input, {
      deviceToken,
      staff,
    });

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
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Place order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
