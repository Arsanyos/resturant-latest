import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireStaff, StaffAuthError } from "@/lib/auth/require-staff";
import {
  MenuError,
  setMenuItemAvailability,
} from "@/lib/menu/service";
import { setMenuItemAvailabilitySchema } from "@/lib/validation/menu";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    // OWNER and KITCHEN both have access_kitchen
    const staff = await requireStaff({ action: "access_kitchen" });
    const { itemId } = await context.params;
    const body = await request.json();
    const input = setMenuItemAvailabilitySchema.parse(body);
    const item = await setMenuItemAvailability(
      itemId,
      input.manualAvailable,
      staff
    );
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof MenuError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Menu availability PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
