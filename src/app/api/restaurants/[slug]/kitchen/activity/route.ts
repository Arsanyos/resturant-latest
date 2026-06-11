import { NextResponse } from "next/server";
import { requireStaff, StaffAuthError } from "@/lib/auth/require-staff";
import { getKitchenActivity, KitchenError } from "@/lib/kitchen/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    await requireStaff({ restaurantSlug: slug, action: "access_kitchen" });

    const data = await getKitchenActivity(slug);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof KitchenError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Kitchen activity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
