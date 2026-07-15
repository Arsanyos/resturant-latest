import { NextResponse } from "next/server";
import { requireStaff, StaffAuthError } from "@/lib/auth/require-staff";
import { getKitchenMenu, MenuError } from "@/lib/menu/service";
import { resolveRestaurantBySlug } from "@/lib/restaurants/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const staff = await requireStaff({
      restaurantSlug: slug,
      action: "access_kitchen",
    });

    const restaurant = await resolveRestaurantBySlug(slug);
    if (!restaurant || restaurant.id !== staff.restaurantId) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const data = await getKitchenMenu(restaurant.id);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof MenuError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Kitchen menu error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
