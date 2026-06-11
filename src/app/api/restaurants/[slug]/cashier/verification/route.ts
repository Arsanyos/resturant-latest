import { NextRequest, NextResponse } from "next/server";
import { StaffAuthError, requireStaff } from "@/lib/auth/require-staff";
import { CashierError, getVerificationQueue } from "@/lib/cashier/service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const staff = await requireStaff({
      restaurantSlug: slug,
      action: "access_cashier",
    });
    const data = await getVerificationQueue(slug, staff);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof CashierError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Verification queue error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
