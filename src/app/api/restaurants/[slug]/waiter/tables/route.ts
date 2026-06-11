import { NextRequest, NextResponse } from "next/server";
import { StaffAuthError, requireStaff } from "@/lib/auth/require-staff";
import { getWaiterTables, WaiterError } from "@/lib/waiter/service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const staff = await requireStaff({
      restaurantSlug: slug,
      action: "access_waiter",
    });
    const data = await getWaiterTables(slug, staff);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof WaiterError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Waiter tables error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
