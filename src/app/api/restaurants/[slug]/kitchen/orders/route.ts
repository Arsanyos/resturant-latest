import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireStaff, StaffAuthError } from "@/lib/auth/require-staff";
import { getKitchenOrders, KitchenError } from "@/lib/kitchen/service";
import { kitchenWindowSchema } from "@/lib/validation/order";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    await requireStaff({ restaurantSlug: slug, action: "access_kitchen" });

    const window = kitchenWindowSchema.parse(
      request.nextUrl.searchParams.get("window") ?? "all"
    );

    const data = await getKitchenOrders(slug, window);
    return NextResponse.json(data);
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
    console.error("Kitchen orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
