import { NextResponse } from "next/server";
import { StaffAuthError, requireStaff } from "@/lib/auth/require-staff";
import { resolveRestaurantBySlug } from "@/lib/restaurants/service";
import { getShiftTipSummary } from "@/lib/tips/queries";
import { WaiterError } from "@/lib/waiter/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const staff = await requireStaff({ action: "access_waiter" });
    const { slug } = await context.params;
    const restaurant = await resolveRestaurantBySlug(slug);

    if (!restaurant) {
      throw new WaiterError("Restaurant not found", 404);
    }

    if (restaurant.id !== staff.restaurantId) {
      throw new WaiterError("Forbidden", 403);
    }

    const summary = await getShiftTipSummary(staff.staffId);

    return NextResponse.json({
      ...summary,
      currency: restaurant.currency,
    });
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof WaiterError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Waiter tips summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
