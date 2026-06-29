import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createSessionSchema } from "@/lib/validation/session";
import { resolveRestaurantBySlug } from "@/lib/restaurants/service";
import { getTableByRestaurantAndNumber } from "@/lib/restaurants/queries";
import { createCustomerSession } from "@/lib/sessions/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createSessionSchema.parse(body);

    const restaurant = await resolveRestaurantBySlug(input.restaurantSlug);

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const table = await getTableByRestaurantAndNumber(
      restaurant.id,
      input.tableNumber
    );

    if (!table || !table.isActive) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const { session, deviceToken } = await createCustomerSession(table.id);

    return NextResponse.json({
      sessionId: session.id,
      deviceToken,
      sessionState: "active_same_device" as const,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Create session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
