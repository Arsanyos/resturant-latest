import { NextRequest, NextResponse } from "next/server";
import { StaffAuthError, requireStaff } from "@/lib/auth/require-staff";
import { CashierError, getCashierSessionBill } from "@/lib/cashier/service";
import { PaymentError } from "@/lib/payments/service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string; sessionId: string }> }
) {
  try {
    const { slug, sessionId } = await context.params;
    const staff = await requireStaff({
      restaurantSlug: slug,
      action: "access_cashier",
    });
    const data = await getCashierSessionBill(slug, sessionId, staff);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof CashierError || error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Cashier bill error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
